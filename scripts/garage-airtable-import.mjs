#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const TYPE_MAP = {
  Replacement: 'replacement',
  'Clean/Lube': 'clean_lube',
  Adjustment: 'adjustment',
  Check: 'check',
};

function parseArgs(argv) {
  const args = {
    email: '',
    vehicleName: 'Bike',
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--email=')) args.email = arg.slice('--email='.length);
    else if (arg.startsWith('--vehicle-name=')) args.vehicleName = arg.slice('--vehicle-name='.length);
  }

  return args;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function fetchAirtableAll({ token, baseId, table }) {
  const all = [];
  let offset = '';
  while (true) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${table} fetch failed (${res.status}): ${body}`);
    }

    const payload = await res.json();
    all.push(...(payload.records ?? []));
    if (!payload.offset) break;
    offset = payload.offset;
  }
  return all;
}

async function resolveUserIdByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) break;
    page += 1;
  }
  throw new Error(`No auth user found for email: ${email}`);
}

function mergeOutcomes(servicingFields) {
  const merged = new Map();
  for (const serviceAirtableId of servicingFields['Affirmed Not Needed'] ?? []) {
    merged.set(serviceAirtableId, 'not_needed_yet');
  }
  for (const serviceAirtableId of servicingFields.Rendered ?? []) {
    merged.set(serviceAirtableId, 'performed');
  }
  return [...merged.entries()].map(([airtableServiceId, status]) => ({ airtableServiceId, status }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email) throw new Error('Usage: node scripts/garage-airtable-import.mjs --email=<target email> [--vehicle-name=Bike] [--dry-run]');

  const airtableToken = requiredEnv('AIRTABLE_BIKE_TOKEN');
  const airtableBaseId = requiredEnv('AIRTABLE_BIKE_BASE_ID');
  const supabaseUrl = requiredEnv('SUPABASE_BATHOS_URL');
  const supabaseServiceRole = requiredEnv('SUPABASE_BATHOS_SERVICE_ROLE');

  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [airtableServices, airtableServicings] = await Promise.all([
    fetchAirtableAll({ token: airtableToken, baseId: airtableBaseId, table: 'Services' }),
    fetchAirtableAll({ token: airtableToken, baseId: airtableBaseId, table: 'Servicings' }),
  ]);

  const userId = await resolveUserIdByEmail(supabase, args.email);

  const { data: existingVehicles, error: existingVehiclesErr } = await supabase
    .from('garage_vehicles')
    .select('id,name')
    .eq('user_id', userId)
    .eq('name', args.vehicleName);
  if (existingVehiclesErr) throw new Error(`Failed to check existing vehicles: ${existingVehiclesErr.message}`);
  if ((existingVehicles ?? []).length > 1) throw new Error(`Multiple existing vehicles named "${args.vehicleName}" found for ${args.email}.`);

  const serviceRows = airtableServices.map((record, index) => {
    const fields = record.fields ?? {};
    const type = TYPE_MAP[fields.Type];
    if (!type) throw new Error(`Unsupported service type "${fields.Type}" on Airtable service ${record.id}`);
    const everyMonths = Number.isFinite(fields['Every (Months)']) ? Number(fields['Every (Months)']) : null;
    return {
      airtableId: record.id,
      row: {
        name: fields.Name,
        type,
        monitoring: Boolean(fields.Monitoring),
        cadence_type: everyMonths && everyMonths > 0 ? 'recurring' : 'no_interval',
        every_months: everyMonths && everyMonths > 0 ? everyMonths : null,
        every_miles: null,
        sort_order: index * 10,
        notes: fields.Notes ?? null,
      },
    };
  });

  const servicingRows = airtableServicings.map((record) => {
    const fields = record.fields ?? {};
    if (!fields.Date) throw new Error(`Servicing ${record.id} missing Date`);
    return {
      airtableId: record.id,
      row: {
        service_date: fields.Date,
        odometer_miles: 0,
        shop_name: fields.Shop ?? null,
        notes: fields.Notes ?? null,
      },
      outcomes: mergeOutcomes(fields),
      receipts: fields.Receipt ?? [],
    };
  });

  const summary = {
    dryRun: args.dryRun,
    email: args.email,
    userId,
    vehicleName: args.vehicleName,
    airtableServices: airtableServices.length,
    airtableServicings: airtableServicings.length,
    servicingOutcomes: servicingRows.reduce((sum, s) => sum + s.outcomes.length, 0),
    attachmentsSkipped: servicingRows.reduce((sum, s) => sum + s.receipts.length, 0),
    willCreateVehicle: (existingVehicles ?? []).length === 0,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  let vehicleId = existingVehicles?.[0]?.id;
  if (!vehicleId) {
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('garage_vehicles')
      .insert({
        user_id: userId,
        name: args.vehicleName,
        make: 'Mission Bicycles',
        model: 'Sutro',
        model_year: 2016,
        in_service_date: null,
        current_odometer_miles: 0,
        is_active: true,
      })
      .select('id')
      .single();
    if (vehicleErr) throw new Error(`Failed to create vehicle: ${vehicleErr.message}`);
    vehicleId = vehicle.id;
  }

  const serviceIdMap = new Map();
  for (const service of serviceRows) {
    const { data, error } = await supabase
      .from('garage_services')
      .insert({
        ...service.row,
        user_id: userId,
        vehicle_id: vehicleId,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Failed to insert garage service ${service.airtableId}: ${error.message}`);
    serviceIdMap.set(service.airtableId, data.id);
  }

  for (const servicing of servicingRows) {
    const { data: servicingInsert, error: servicingErr } = await supabase
      .from('garage_servicings')
      .insert({
        ...servicing.row,
        user_id: userId,
        vehicle_id: vehicleId,
      })
      .select('id')
      .single();
    if (servicingErr) throw new Error(`Failed to insert garage servicing ${servicing.airtableId}: ${servicingErr.message}`);

    const outcomeRows = servicing.outcomes.map((o) => {
      const serviceId = serviceIdMap.get(o.airtableServiceId);
      if (!serviceId) {
        throw new Error(
          `Servicing ${servicing.airtableId} outcome references unknown service ${o.airtableServiceId}`,
        );
      }
      return {
        user_id: userId,
        vehicle_id: vehicleId,
        servicing_id: servicingInsert.id,
        service_id: serviceId,
        status: o.status,
      };
    });

    if (outcomeRows.length > 0) {
      const { error: outcomesErr } = await supabase
        .from('garage_servicing_services')
        .insert(outcomeRows);
      if (outcomesErr) throw new Error(`Failed to insert servicing outcomes for ${servicing.airtableId}: ${outcomesErr.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        insertedVehicleId: vehicleId,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
