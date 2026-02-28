-- ─── 새로운 형태 기반 파츠 마이그레이션 ───
-- 기존 색상 변형 (top/bottom/shoes) → 형태 구별 파츠로 교체

-- ── 1. 기존 색상 변형 아이템 삭제 ──
DELETE FROM shop_items WHERE image_key IN (
  'top_blue', 'top_red', 'top_green', 'top_black'
);
DELETE FROM shop_items WHERE image_key IN (
  'bottom_navy', 'bottom_brown', 'bottom_green', 'bottom_white'
);
DELETE FROM shop_items WHERE image_key IN (
  'shoes_white', 'shoes_black', 'shoes_red', 'shoes_gold'
);

-- ── 2. 기본 아이템 이름 업데이트 ──
UPDATE shop_items SET name = '기본 상의', description = '편안한 기본 상의' WHERE image_key = 'top_default';
UPDATE shop_items SET name = '기본 하의', description = '편안한 기본 하의' WHERE image_key = 'bottom_default';
UPDATE shop_items SET name = '기본 신발', description = '편안한 기본 신발' WHERE image_key = 'shoes_default';

-- ── 3. 신규 상의 파츠 (형태 구별) ──
INSERT INTO shop_items (name, description, category, image_key, price) VALUES
  ('후드티',     '크고 편안한 후드가 달린 상의',       'top', 'top_hoodie',  30),
  ('슈트',       '넥타이가 포함된 정장 재킷',           'top', 'top_suit',    80),
  ('스트라이프', '세련된 가로줄무늬 셔츠',              'top', 'top_stripe',  30),
  ('스포츠웨어', 'V넥 사이드 스트라이프 스포츠 상의',   'top', 'top_sports',  50)
ON CONFLICT (image_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- ── 4. 신규 하의 파츠 (형태 구별) ──
INSERT INTO shop_items (name, description, category, image_key, price) VALUES
  ('반바지',    '시원한 무릎 위 반바지',           'bottom', 'bottom_shorts', 30),
  ('스커트',    '플레어 A라인 스커트',             'bottom', 'bottom_skirt',  50),
  ('카고팬츠',  '포켓이 달린 실용적인 카고팬츠',   'bottom', 'bottom_cargo',  30),
  ('슬랙스',    '깔끔한 크리즈 라인 정장 슬랙스', 'bottom', 'bottom_slacks', 80)
ON CONFLICT (image_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- ── 5. 신규 신발 파츠 (형태 구별) ──
INSERT INTO shop_items (name, description, category, image_key, price) VALUES
  ('부츠',       '발목까지 올라오는 버클 부츠',    'shoes', 'shoes_boots',   30),
  ('플랫슈즈',   '가볍고 편안한 리본 플랫슈즈',    'shoes', 'shoes_flats',   30),
  ('힐',         '우아한 뾰족 굽 힐',              'shoes', 'shoes_heels',   80),
  ('구두',       '광택 나는 가죽 정장 구두',       'shoes', 'shoes_formal',  50)
ON CONFLICT (image_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price;

-- ── 6. 기존 삭제된 아이템을 장착한 유저 기본값으로 리셋 ──
UPDATE profiles SET avatar_top    = 'top_default'    WHERE avatar_top    IN ('top_blue', 'top_red', 'top_green', 'top_black');
UPDATE profiles SET avatar_bottom = 'bottom_default' WHERE avatar_bottom IN ('bottom_navy', 'bottom_brown', 'bottom_green', 'bottom_white');
UPDATE profiles SET avatar_shoes  = 'shoes_default'  WHERE avatar_shoes  IN ('shoes_white', 'shoes_black', 'shoes_red', 'shoes_gold');
