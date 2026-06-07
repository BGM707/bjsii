/*
  # Update user password hash with correct value

  1. Updates the password hash for the default user with the correct SHA256 hash
*/

UPDATE users
SET password_hash = '13b5b7b99118318a2c704651faedc38c7fc773d603eab1a29bc261624524850f'
WHERE username = 'Fuko197160551';