-- ─── 아바타 디자인 시스템 업그레이드 마이그레이션 ───
-- 단순 색상 → 모자/표정 디자인 기반으로 교체

-- 기존 헤어 컬러 아이템 삭제 (기본 헤어는 유지)
DELETE FROM shop_items WHERE image_key IN ('hair_red', 'hair_gold', 'hair_blue', 'hair_pink');

-- 기존 얼굴 피부 아이템 삭제 (기본 얼굴은 유지)
DELETE FROM shop_items WHERE image_key IN ('face_rosy', 'face_cool', 'face_tan', 'face_pale');

-- 새 모자 아이템 (hair 슬롯)
INSERT INTO shop_items (name, description, category, image_key, price) VALUES
  ('야구모자',  '캐주얼한 야구모자',          'hair', 'hat_cap',    30),
  ('왕관',      '반짝이는 금색 왕관',          'hair', 'hat_crown', 150),
  ('비니',      '폼폼 달린 아늑한 비니',       'hair', 'hat_beanie', 30),
  ('중절모',    '클래식 중절모',               'hair', 'hat_top',    80)
ON CONFLICT (image_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- 새 표정 아이템 (face 슬롯)
INSERT INTO shop_items (name, description, category, image_key, price) VALUES
  ('선글라스', '쿨한 선글라스',           'face', 'face_sunglasses', 30),
  ('윙크',     '귀여운 윙크 표정',        'face', 'face_wink',        30),
  ('화남',     '불같이 화난 표정',        'face', 'face_angry',       30),
  ('고양이',   '냥냥 고양이 표정',        'face', 'face_cat',         80)
ON CONFLICT (image_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- 기존 기본 아이템 이름 업데이트
UPDATE shop_items SET name = '기본 헤어', description = '자연스러운 기본 헤어스타일' WHERE image_key = 'hair_default';
UPDATE shop_items SET name = '기본 표정', description = '자연스러운 기본 표정'        WHERE image_key = 'face_default';
