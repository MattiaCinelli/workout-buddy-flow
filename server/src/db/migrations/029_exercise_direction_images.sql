-- Direction-specific exercise images use the same authenticated private-media
-- markers as the default image. JSON keeps the sparse direction map compact.
ALTER TABLE exercises ADD COLUMN direction_image_urls TEXT;
