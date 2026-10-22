INSERT INTO kyc_admin_passcodes (email, name, passcode_hash)
VALUES (
  'ngoujeromen@gmail.com',
  'Jérôme Admin',
  '$2a$10$pRUYAHHkb/q2gNidGtclG.n4vJYHlMWIaZnngW3FS7HXgH.5bd8E.'
) ON CONFLICT (email) DO UPDATE
  SET passcode_hash = '$2a$10$pRUYAHHkb/q2gNidGtclG.n4vJYHlMWIaZnngW3FS7HXgH.5bd8E.',
      is_active = true;
