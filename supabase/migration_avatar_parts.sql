-- ─── 아바타 파츠 시스템 마이그레이션 ───
-- profiles 테이블에 5개 파츠 컬럼 추가

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_hair TEXT NOT NULL DEFAULT 'hair_default',
  ADD COLUMN IF NOT EXISTS avatar_face TEXT NOT NULL DEFAULT 'face_default',
  ADD COLUMN IF NOT EXISTS avatar_top  TEXT NOT NULL DEFAULT 'top_default',
  ADD COLUMN IF NOT EXISTS avatar_bottom TEXT NOT NULL DEFAULT 'bottom_default',
  ADD COLUMN IF NOT EXISTS avatar_shoes TEXT NOT NULL DEFAULT 'shoes_default';

-- shop_items.category CHECK 제약 확장
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;
ALTER TABLE shop_items
  ADD CONSTRAINT shop_items_category_check
  CHECK (category IN ('body', 'accessory', 'hair', 'face', 'top', 'bottom', 'shoes'));

-- image_key UNIQUE 제약 (중복 시드 방지)
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_image_key_key;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_image_key_key UNIQUE (image_key);

-- ─── 25개 아바타 파츠 아이템 시드 ───
INSERT INTO shop_items (name, description, category, image_key, price) VALUES
  -- 머리카락 (hair)
  ('기본 헤어',   '클래식한 기본 헤어스타일',   'hair', 'hair_default', 0),
  ('레드 헤어',   '열정적인 빨간 머리',          'hair', 'hair_red',     30),
  ('골든 헤어',   '화려한 금발 머리',            'hair', 'hair_gold',    30),
  ('블루 헤어',   '청량한 파란 머리',            'hair', 'hair_blue',    80),
  ('핑크 헤어',   '사랑스러운 핑크 머리',        'hair', 'hair_pink',   150),

  -- 얼굴 (face)
  ('기본 피부',   '자연스러운 기본 피부',        'face', 'face_default', 0),
  ('발그레 피부', '귀여운 발그레한 피부',        'face', 'face_rosy',   30),
  ('쿨 피부',    '시원한 느낌의 피부',           'face', 'face_cool',   30),
  ('태닝 피부',   '건강한 태닝 피부',            'face', 'face_tan',    80),
  ('창백 피부',   '신비로운 창백한 피부',        'face', 'face_pale',  150),

  -- 상의 (top)
  ('기본 상의',   '깔끔한 기본 상의',            'top', 'top_default',  0),
  ('블루 상의',   '시원한 블루 상의',            'top', 'top_blue',    30),
  ('레드 상의',   '열정적인 레드 상의',          'top', 'top_red',     30),
  ('그린 상의',   '싱그러운 그린 상의',          'top', 'top_green',   80),
  ('블랙 상의',   '세련된 블랙 상의',            'top', 'top_black',  150),

  -- 하의 (bottom)
  ('기본 하의',   '편안한 기본 하의',            'bottom', 'bottom_default', 0),
  ('네이비 하의', '클래식한 네이비 바지',        'bottom', 'bottom_navy',   30),
  ('브라운 하의', '따뜻한 브라운 바지',          'bottom', 'bottom_brown',  30),
  ('다크그린 하의','자연스러운 다크그린 바지',   'bottom', 'bottom_green',  80),
  ('화이트 하의', '깨끗한 화이트 바지',          'bottom', 'bottom_white', 150),

  -- 신발 (shoes)
  ('기본 신발',   '편안한 기본 신발',            'shoes', 'shoes_default', 0),
  ('화이트 신발', '깔끔한 화이트 스니커즈',      'shoes', 'shoes_white',  30),
  ('블랙 신발',   '세련된 블랙 슈즈',            'shoes', 'shoes_black',  30),
  ('레드 신발',   '포인트 레드 신발',            'shoes', 'shoes_red',    80),
  ('골드 신발',   '럭셔리 골드 신발',            'shoes', 'shoes_gold',  150)
ON CONFLICT (image_key) DO NOTHING;
