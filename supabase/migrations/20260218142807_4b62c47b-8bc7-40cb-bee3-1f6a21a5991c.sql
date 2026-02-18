
-- Table for terms-related user feedback sent to webmaster
CREATE TABLE public.bathos_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'terms_update',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bathos_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit their own feedback"
ON public.bathos_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.bathos_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Constraint: message max 2000 chars
ALTER TABLE public.bathos_feedback
ADD CONSTRAINT bathos_feedback_message_length CHECK (char_length(message) <= 2000);
