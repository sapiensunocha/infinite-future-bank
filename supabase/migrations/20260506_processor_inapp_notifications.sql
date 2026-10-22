-- Send in-app notifications to all P2P processors about their upgrade
-- Using correct notifications table schema: message, type, read, status
INSERT INTO public.notifications (user_id, type, read, status, message)
SELECT
  p.id,
  'system',
  false,
  'completed',
  'You are now a Verified IFB P2P Processor — You can now facilitate withdrawals and deposits for other IFB members and earn fees on every transaction. Processor rating: 100/100.'
FROM public.profiles p
WHERE p.is_cot_processor = TRUE
ON CONFLICT DO NOTHING;

-- Mark all processor_upgrade emails as sent (delivered via in-app notification)
UPDATE public.system_emails
SET status = 'sent', sent_at = NOW(), error = 'delivered_via_inapp'
WHERE template = 'processor_upgrade';
