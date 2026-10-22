-- Reset failed processor upgrade emails to pending for retry
UPDATE system_emails
SET status = 'pending', error = NULL, sent_at = NULL
WHERE template = 'processor_upgrade' AND status = 'failed';
