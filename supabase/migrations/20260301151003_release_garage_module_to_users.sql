-- Release Garage module to all authenticated users (no admin role required).

-- Garage table policies
DROP POLICY IF EXISTS "Admins can view own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Admins can insert own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Admins can update own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Admins can delete own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Users can view own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Users can insert own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Users can update own garage user settings" ON public.garage_user_settings;
DROP POLICY IF EXISTS "Users can delete own garage user settings" ON public.garage_user_settings;

CREATE POLICY "Users can view own garage user settings"
ON public.garage_user_settings
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage user settings"
ON public.garage_user_settings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage user settings"
ON public.garage_user_settings
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage user settings"
ON public.garage_user_settings
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Admins can insert own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Admins can update own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Admins can delete own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Users can view own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Users can insert own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Users can update own garage vehicles" ON public.garage_vehicles;
DROP POLICY IF EXISTS "Users can delete own garage vehicles" ON public.garage_vehicles;

CREATE POLICY "Users can view own garage vehicles"
ON public.garage_vehicles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage vehicles"
ON public.garage_vehicles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage vehicles"
ON public.garage_vehicles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage vehicles"
ON public.garage_vehicles
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Admins can insert own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Admins can update own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Admins can delete own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Users can view own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Users can insert own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Users can update own garage services" ON public.garage_services;
DROP POLICY IF EXISTS "Users can delete own garage services" ON public.garage_services;

CREATE POLICY "Users can view own garage services"
ON public.garage_services
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage services"
ON public.garage_services
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage services"
ON public.garage_services
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage services"
ON public.garage_services
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Admins can insert own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Admins can update own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Admins can delete own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Users can view own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Users can insert own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Users can update own garage servicings" ON public.garage_servicings;
DROP POLICY IF EXISTS "Users can delete own garage servicings" ON public.garage_servicings;

CREATE POLICY "Users can view own garage servicings"
ON public.garage_servicings
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage servicings"
ON public.garage_servicings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage servicings"
ON public.garage_servicings
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage servicings"
ON public.garage_servicings
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Admins can insert own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Admins can update own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Admins can delete own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Users can view own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Users can insert own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Users can update own garage servicing services" ON public.garage_servicing_services;
DROP POLICY IF EXISTS "Users can delete own garage servicing services" ON public.garage_servicing_services;

CREATE POLICY "Users can view own garage servicing services"
ON public.garage_servicing_services
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage servicing services"
ON public.garage_servicing_services
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage servicing services"
ON public.garage_servicing_services
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage servicing services"
ON public.garage_servicing_services
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Admins can insert own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Admins can update own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Admins can delete own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Users can view own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Users can insert own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Users can update own garage servicing receipts" ON public.garage_servicing_receipts;
DROP POLICY IF EXISTS "Users can delete own garage servicing receipts" ON public.garage_servicing_receipts;

CREATE POLICY "Users can view own garage servicing receipts"
ON public.garage_servicing_receipts
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garage servicing receipts"
ON public.garage_servicing_receipts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garage servicing receipts"
ON public.garage_servicing_receipts
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own garage servicing receipts"
ON public.garage_servicing_receipts
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Garage receipt storage policies
DROP POLICY IF EXISTS "Admins can upload own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own garage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own garage receipts" ON storage.objects;

CREATE POLICY "Users can upload own garage receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'garage-receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can view own garage receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'garage-receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update own garage receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'garage-receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'garage-receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete own garage receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'garage-receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);
