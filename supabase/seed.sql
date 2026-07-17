-- ============================================================
-- CastConnect — Seed Data
-- Run AFTER schema.sql has been applied.
-- ⚠️  Requires pgcrypto (already enabled in schema.sql)
--
-- 🔑 Test login credentials (all seed users):
--    Password: Test@1234
--
-- 👤 Primary test account (the "me" user in the app):
--    Email:    alex.rivera@email.com
--    Password: Test@1234
-- ============================================================

-- UUIDs used in this file (for reference):
-- Alex Rivera (me)      : 00000000-0000-4000-8000-000000000000
-- Arjun Mehta (user-1)  : 00000000-0000-4000-8000-000000000001
-- Priya Sharma (user-2) : 00000000-0000-4000-8000-000000000002
-- Rohan Kapoor (user-3) : 00000000-0000-4000-8000-000000000003
-- Kavita Prod (user-4)  : 00000000-0000-4000-8000-000000000004
-- Neha Agarwal (user-5) : 00000000-0000-4000-8000-000000000005
-- Siddharth Rao (user-6): 00000000-0000-4000-8000-000000000006
-- Meera Desai (user-7)  : 00000000-0000-4000-8000-000000000007
-- Vikram Singh (user-8) : 00000000-0000-4000-8000-000000000008
-- Anita Kumari (user-9) : 00000000-0000-4000-8000-000000000009
-- Deepak Malhotra(u-10) : 00000000-0000-4000-8000-000000000010
-- Fatima Khan (user-11) : 00000000-0000-4000-8000-000000000011
-- Rajesh Nair (user-12) : 00000000-0000-4000-8000-000000000012
-- Aakash Patel (user-13): 00000000-0000-4000-8000-000000000013
-- Sunita Reddy (user-14): 00000000-0000-4000-8000-000000000014
-- Rahul Verma (user-15) : 00000000-0000-4000-8000-000000000015
-- Kavya Iyer (user-16)  : 00000000-0000-4000-8000-000000000016
-- Mohit Joshi (user-17) : 00000000-0000-4000-8000-000000000017
-- Zara Sheikh (user-18) : 00000000-0000-4000-8000-000000000018
-- Karan Bhatia (user-19): 00000000-0000-4000-8000-000000000019
-- Tara Menon (user-20)  : 00000000-0000-4000-8000-000000000020

-- ────────────────────────────────────────────────────────────
-- CLEAN UP (idempotent — safe to re-run)
-- ────────────────────────────────────────────────────────────
delete from public.crew_basket_items
  where basket_id in (
    select id from public.crew_baskets
    where owner_id = '00000000-0000-4000-8000-000000000000'
  );
delete from public.crew_baskets
  where owner_id = '00000000-0000-4000-8000-000000000000';
delete from public.messages
  where sender_id::text like '00000000-0000-4000-8000-%'
     or receiver_id::text like '00000000-0000-4000-8000-%';
delete from public.applications
  where applicant_id::text like '00000000-0000-4000-8000-%';
delete from public.connections
  where follower_id::text like '00000000-0000-4000-8000-%';
delete from public.casting_calls
  where id::text like 'cc%0000-0000-4000-8000-%';
delete from public.profiles
  where id::text like '00000000-0000-4000-8000-%';
delete from auth.users
  where id::text like '00000000-0000-4000-8000-%';

-- ────────────────────────────────────────────────────────────
-- AUTH USERS (21 users — all password: Test@1234)
-- ────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
)
values
  ('00000000-0000-4000-8000-000000000000','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'alex.rivera@email.com',    crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Alex Rivera"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'arjun@email.com',          crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Arjun Mehta"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'priya.sharma@email.com',   crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Priya Sharma"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rohan.k@email.com',        crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Rohan Kapoor"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'contact@kavitaprod.com',   crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Kavita Productions"}',  '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'neha@castingdesk.com',     crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Neha Agarwal"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'sid.rao@email.com',        crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Siddharth Rao"}',       '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'meera.desai@email.com',    crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Meera Desai"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'vikram.writer@email.com',  crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Vikram Singh"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'anita.light@email.com',    crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Anita Kumari"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'deepak.pd@email.com',      crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Deepak Malhotra"}',     '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'fatima.mua@email.com',     crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Fatima Khan"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000012','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rajesh.costume@email.com', crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Rajesh Nair"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000013','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'aakash.vfx@email.com',     crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Aakash Patel"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000014','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'sunita.dance@email.com',   crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Sunita Reddy"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000015','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'rahul.stunts@email.com',   crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Rahul Verma"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000016','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'kavya.iyer@email.com',     crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Kavya Iyer"}',          '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000017','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'mohit.dop@email.com',      crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Mohit Joshi"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000018','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'zara.director@email.com',  crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Zara Sheikh"}',         '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000019','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'karan.light@email.com',    crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Karan Bhatia"}',        '{"provider":"email","providers":["email"]}'),

  ('00000000-0000-4000-8000-000000000020','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'tara.writer@email.com',    crypt('Test@1234', gen_salt('bf', 10)), now(), now(), now(),
   '{"name":"Tara Menon"}',          '{"provider":"email","providers":["email"]}');

-- ────────────────────────────────────────────────────────────
-- PROFILES
-- The auth trigger already created a minimal row per user.
-- ON CONFLICT DO UPDATE overwrites it with full profile data.
-- ────────────────────────────────────────────────────────────
insert into public.profiles (
  id, name, role, title, crew_role, bio, skills, experience, experience_years,
  location, availability, portfolio_links, profile_image, contact_email,
  contact_phone, is_verified, industry_types, day_rate, rating, review_count, created_at
) values

-- Alex Rivera (test / "me")
('00000000-0000-4000-8000-000000000000',
 'Alex Rivera','talent','Actor & Filmmaker','Actor',
 'Passionate about storytelling through cinema. Trained in method acting with experience across feature films, OTT series, and theatre productions.',
 array['Acting','Direction','Screenwriting','Hindi','English','Tamil'],
 '6 years',6,'Mumbai, India','available',
 array['https://youtube.com/alexrivera','https://vimeo.com/alexreel'],
 null,'alex.rivera@email.com','+91 9876543200',true,
 array['film','ott','theatre']::text[],45000,4.6,24,'2023-11-01T10:00:00Z'),

-- Arjun Mehta
('00000000-0000-4000-8000-000000000001',
 'Arjun Mehta','talent','Lead Actor','Actor',
 'Trained at FTII with 8 years of experience in feature films and OTT series. Specializing in dramatic and action roles.',
 array['Acting','Action','Dance','Dialogue Delivery','Hindi','English'],
 '8 years',8,'Mumbai, India','available',
 array['https://youtube.com/arjunmehta','https://vimeo.com/arjunreel'],
 null,'arjun@email.com','+91 9876543210',true,
 array['film','ott','web_series']::text[],50000,4.8,32,'2024-01-15T10:00:00Z'),

-- Priya Sharma
('00000000-0000-4000-8000-000000000002',
 'Priya Sharma','talent','Cinematographer','Cinematographer',
 'Award-winning cinematographer with a keen eye for visual storytelling. Worked on 15+ feature films and numerous ad campaigns.',
 array['Cinematography','Lighting','Color Grading','Drone Operation','ARRI','RED'],
 '12 years',12,'Delhi, India','available',
 array['https://vimeo.com/priyasharma'],
 null,'priya.sharma@email.com','+91 9876543211',true,
 array['film','ad_film','music_video']::text[],75000,4.9,45,'2024-02-20T10:00:00Z'),

-- Rohan Kapoor
('00000000-0000-4000-8000-000000000003',
 'Rohan Kapoor','talent','Writer & Director','Director',
 'Emerging filmmaker with 2 short films at international festivals. Looking for feature-length opportunities.',
 array['Screenwriting','Direction','Editing','Story Development','Hindi','Urdu'],
 '4 years',4,'Mumbai, India','busy',
 array['https://drive.google.com/rohanscripts'],
 null,'rohan.k@email.com','+91 9876543212',false,
 array['film','web_series','theatre']::text[],35000,4.3,8,'2024-03-10T10:00:00Z'),

-- Kavita Productions
('00000000-0000-4000-8000-000000000004',
 'Kavita Productions','producer','Production House','Producer',
 'Leading production house behind 20+ acclaimed films. Currently developing a slate of OTT originals.',
 array['Production','Financing','Distribution','Project Management'],
 '18 years',18,'Mumbai, India','available',
 array['https://kavitaproductions.com'],
 null,'contact@kavitaprod.com','+91 9876543213',true,
 array['film','ott','web_series']::text[],0,4.7,60,'2023-06-01T10:00:00Z'),

-- Neha Agarwal
('00000000-0000-4000-8000-000000000005',
 'Neha Agarwal','casting_director','Casting Director','Casting Director',
 'Cast for 30+ feature films and series. Known for discovering fresh talent and perfect casting choices.',
 array['Casting','Talent Scouting','Audition Management','Negotiation'],
 '10 years',10,'Mumbai, India','available',
 array[]::text[],
 null,'neha@castingdesk.com','+91 9876543214',true,
 array['film','ott','ad_film','web_series']::text[],40000,4.9,55,'2023-09-15T10:00:00Z'),

-- Siddharth Rao
('00000000-0000-4000-8000-000000000006',
 'Siddharth Rao','talent','Sound Designer','Sound Designer',
 'Professional sound designer and mixer with experience in Dolby Atmos and spatial audio for cinema.',
 array['Sound Design','Mixing','Foley','ADR','Dolby Atmos','Pro Tools'],
 '6 years',6,'Hyderabad, India','available',
 array['https://soundcloud.com/sidrao'],
 null,'sid.rao@email.com','+91 9876543215',false,
 array['film','ott','ad_film']::text[],25000,4.5,18,'2024-04-05T10:00:00Z'),

-- Meera Desai
('00000000-0000-4000-8000-000000000007',
 'Meera Desai','talent','Film Editor','Editor',
 'Skilled editor with expertise in narrative pacing. Worked on 10+ feature films including 3 national award winners.',
 array['Editing','DaVinci Resolve','Premiere Pro','Color Grading','Sound Sync'],
 '9 years',9,'Mumbai, India','available',
 array['https://vimeo.com/meeraedits'],
 null,'meera.desai@email.com','+91 9876543216',true,
 array['film','ott','web_series']::text[],45000,4.7,28,'2024-01-20T10:00:00Z'),

-- Vikram Singh
('00000000-0000-4000-8000-000000000008',
 'Vikram Singh','talent','Screenwriter','Writer',
 'Published screenwriter with scripts for 5 feature films and 2 OTT series. Strong in dialogue and character arcs.',
 array['Screenwriting','Dialogue','Story Development','Script Doctoring','Hindi','English'],
 '7 years',7,'Mumbai, India','available',
 array['https://drive.google.com/vikramscripts'],
 null,'vikram.writer@email.com','+91 9876543217',true,
 array['film','ott','theatre']::text[],30000,4.6,22,'2024-02-01T10:00:00Z'),

-- Anita Kumari
('00000000-0000-4000-8000-000000000009',
 'Anita Kumari','talent','Lighting Director','Lightman',
 'Expert gaffer and lighting director with deep understanding of mood lighting for film and stage. Known for innovative setups.',
 array['Lighting','Gaffer','Electrical','LED Panels','Tungsten','HMI'],
 '11 years',11,'Chennai, India','available',
 array[]::text[],
 null,'anita.light@email.com','+91 9876543218',false,
 array['film','ad_film','music_video']::text[],20000,4.4,15,'2024-03-01T10:00:00Z'),

-- Deepak Malhotra
('00000000-0000-4000-8000-000000000010',
 'Deepak Malhotra','talent','Production Designer','Production Designer',
 'Award-winning production designer specializing in period and fantasy sets. Worked on 8 feature films.',
 array['Set Design','Art Direction','Period Design','Model Making','3D Visualization'],
 '14 years',14,'Mumbai, India','busy',
 array['https://deepakdesigns.com'],
 null,'deepak.pd@email.com','+91 9876543219',true,
 array['film','ott','theatre']::text[],60000,4.8,35,'2023-11-15T10:00:00Z'),

-- Fatima Khan
('00000000-0000-4000-8000-000000000011',
 'Fatima Khan','talent','Makeup & Prosthetics Artist','Makeup Artist',
 'Specialist in character transformation and prosthetic makeup for film. Trained at L.A. makeup school.',
 array['Makeup','Prosthetics','SFX Makeup','Character Design','Aging Techniques'],
 '8 years',8,'Mumbai, India','available',
 array['https://instagram.com/fatimamakeup'],
 null,'fatima.mua@email.com','+91 9876543220',true,
 array['film','ott','ad_film','theatre']::text[],35000,4.7,40,'2024-01-05T10:00:00Z'),

-- Rajesh Nair
('00000000-0000-4000-8000-000000000012',
 'Rajesh Nair','talent','Costume Designer','Costume Designer',
 'Fashion-forward costume designer bridging contemporary and traditional Indian aesthetics for film.',
 array['Costume Design','Textile Knowledge','Period Costuming','Styling','Tailoring'],
 '10 years',10,'Bangalore, India','available',
 array['https://rajeshnairdesigns.com'],
 null,'rajesh.costume@email.com','+91 9876543221',false,
 array['film','ott','ad_film']::text[],30000,4.5,20,'2024-02-10T10:00:00Z'),

-- Aakash Patel
('00000000-0000-4000-8000-000000000013',
 'Aakash Patel','talent','VFX Supervisor','VFX Artist',
 'VFX supervisor with credits on major Bollywood blockbusters. Expert in compositing, CGI, and virtual production.',
 array['VFX','Compositing','CGI','Nuke','Houdini','Unreal Engine'],
 '9 years',9,'Mumbai, India','available',
 array['https://vimeo.com/aakashvfx'],
 null,'aakash.vfx@email.com','+91 9876543222',true,
 array['film','ott','ad_film']::text[],55000,4.6,25,'2024-03-20T10:00:00Z'),

-- Sunita Reddy
('00000000-0000-4000-8000-000000000014',
 'Sunita Reddy','talent','Choreographer','Choreographer',
 'Versatile choreographer trained in Bharatanatyam, contemporary, and Bollywood dance forms. Choreographed 50+ songs.',
 array['Choreography','Bharatanatyam','Contemporary','Hip Hop','Bollywood'],
 '15 years',15,'Mumbai, India','available',
 array['https://youtube.com/sunitadance'],
 null,'sunita.dance@email.com','+91 9876543223',true,
 array['film','ott','music_video','theatre']::text[],45000,4.8,50,'2023-08-10T10:00:00Z'),

-- Rahul Verma
('00000000-0000-4000-8000-000000000015',
 'Rahul Verma','talent','Stunt Coordinator','Stunt Coordinator',
 'International stunt coordinator with training from Hong Kong action school. Safety-first approach with spectacular results.',
 array['Stunts','Action Choreography','Wire Work','Fight Scenes','Safety Coordination'],
 '13 years',13,'Mumbai, India','available',
 array['https://youtube.com/rahulstunts'],
 null,'rahul.stunts@email.com','+91 9876543224',true,
 array['film','ott','ad_film']::text[],50000,4.9,38,'2023-10-01T10:00:00Z'),

-- Kavya Iyer
('00000000-0000-4000-8000-000000000016',
 'Kavya Iyer','talent','Actress','Actor',
 'National School of Drama graduate with range from comedy to intense drama. Fluent in 4 languages.',
 array['Acting','Theatre','Dance','Hindi','English','Tamil','Malayalam'],
 '5 years',5,'Mumbai, India','available',
 array['https://vimeo.com/kavyareel'],
 null,'kavya.iyer@email.com','+91 9876543225',false,
 array['film','ott','theatre','web_series']::text[],40000,4.4,12,'2024-04-01T10:00:00Z'),

-- Mohit Joshi
('00000000-0000-4000-8000-000000000017',
 'Mohit Joshi','talent','Director of Photography','Cinematographer',
 'FTII alumni specializing in naturalistic lighting. Shot 3 Cannes-selected short films and 2 features.',
 array['Cinematography','Natural Light','Steadicam','Underwater','ARRI Alexa'],
 '7 years',7,'Pune, India','available',
 array['https://vimeo.com/mohitdop'],
 null,'mohit.dop@email.com','+91 9876543226',true,
 array['film','ad_film']::text[],55000,4.7,19,'2024-02-15T10:00:00Z'),

-- Zara Sheikh
('00000000-0000-4000-8000-000000000018',
 'Zara Sheikh','talent','Film Director','Director',
 'Award-winning director known for socially conscious narratives. Debut feature won 3 national awards.',
 array['Direction','Script Analysis','Actor Direction','Visual Storytelling','Hindi','Urdu'],
 '10 years',10,'Mumbai, India','busy',
 array['https://vimeo.com/zaradirects'],
 null,'zara.director@email.com','+91 9876543227',true,
 array['film','ott','web_series']::text[],80000,4.9,42,'2023-07-01T10:00:00Z'),

-- Karan Bhatia
('00000000-0000-4000-8000-000000000019',
 'Karan Bhatia','talent','Gaffer & Lightman','Lightman',
 'Experienced gaffer handling large-scale film lighting setups. Expert in both indoor and outdoor environments.',
 array['Lighting','Grip','Generator Operation','LED Systems','Power Distribution'],
 '8 years',8,'Mumbai, India','available',
 array[]::text[],
 null,'karan.light@email.com','+91 9876543228',false,
 array['film','ott','ad_film']::text[],15000,4.3,11,'2024-05-01T10:00:00Z'),

-- Tara Menon
('00000000-0000-4000-8000-000000000020',
 'Tara Menon','talent','Screenwriter','Writer',
 'Emmy-nominated writer for Hindi OTT series. Specializes in thriller and crime genres.',
 array['Screenwriting','Show Running','Thriller','Crime Genre','English','Hindi'],
 '12 years',12,'Mumbai, India','available',
 array['https://taramenon.com'],
 null,'tara.writer@email.com','+91 9876543229',true,
 array['film','ott','web_series']::text[],50000,4.8,30,'2023-12-01T10:00:00Z')
on conflict (id) do update set
  name             = excluded.name,
  role             = excluded.role,
  title            = excluded.title,
  crew_role        = excluded.crew_role,
  bio              = excluded.bio,
  skills           = excluded.skills,
  experience       = excluded.experience,
  experience_years = excluded.experience_years,
  location         = excluded.location,
  availability     = excluded.availability,
  portfolio_links  = excluded.portfolio_links,
  contact_email    = excluded.contact_email,
  contact_phone    = excluded.contact_phone,
  is_verified      = excluded.is_verified,
  industry_types   = excluded.industry_types,
  day_rate         = excluded.day_rate,
  rating           = excluded.rating,
  review_count     = excluded.review_count,
  created_at       = excluded.created_at;

-- ────────────────────────────────────────────────────────────
-- CONNECTIONS (from mock data)
-- ────────────────────────────────────────────────────────────
insert into public.connections (follower_id, following_id) values
  -- Alex Rivera follows: user-1, user-4, user-5
  ('00000000-0000-4000-8000-000000000000','00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000000','00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000000','00000000-0000-4000-8000-000000000005'),
  -- Arjun Mehta follows: user-4, user-5
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005'),
  -- Priya Sharma follows: user-4
  ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004'),
  -- Kavita Productions follows: user-1, user-2
  ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002'),
  -- Neha Agarwal follows: user-1
  ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001'),
  -- Meera Desai follows: user-4
  ('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000004'),
  -- Deepak Malhotra follows: user-4
  ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000004'),
  -- Zara Sheikh follows: user-4
  ('00000000-0000-4000-8000-000000000018','00000000-0000-4000-8000-000000000004');

-- ────────────────────────────────────────────────────────────
-- CASTING CALLS
-- applicant_count seeded directly (trigger would double-count).
-- Deadlines are relative to the seed date (current_date + N days) so the
-- demo calls are always in the future — i.e. "open" and applyable, and not
-- rejected by the deadline guard added in migration 0006.
-- ────────────────────────────────────────────────────────────
insert into public.casting_calls (
  id, title, description, role_needed, project_type, project_name,
  location, compensation, deadline, posted_by,
  skills_required, experience_level, status, applicant_count, created_at
) values

('cc100000-0000-4000-8000-000000000001',
 'Lead Male Actor for Period Drama',
 'Seeking a versatile actor aged 28-35 for the lead role in an upcoming period drama set in 1947 India. Must be comfortable with intense emotional scenes and period dialect.',
 'Lead Actor','film','The Last Monsoon',
 'Mumbai, India','As per industry standards',(current_date + 30),
 '00000000-0000-4000-8000-000000000004',
 array['Acting','Hindi','Dialogue Delivery','Horse Riding'],
 '5+ years','open',24,'2026-02-10T10:00:00Z'),

('cc200000-0000-4000-8000-000000000002',
 'Cinematographer for OTT Series',
 'Looking for an experienced cinematographer for an 8-episode thriller series. Must have experience with low-light shooting and handheld work.',
 'Cinematographer','ott','Shadows Within',
 'Delhi & Jaipur','Competitive package',(current_date + 45),
 '00000000-0000-4000-8000-000000000005',
 array['Cinematography','Low-light','Handheld','ARRI'],
 '8+ years','open',12,'2026-02-05T10:00:00Z'),

('cc300000-0000-4000-8000-000000000003',
 'Supporting Actress for Ad Film',
 'Casting for a supporting role in a premium automobile brand ad. Looking for someone aged 25-30 with a natural, modern look.',
 'Supporting Actress','ad_film','Brand Campaign',
 'Goa, India','2-3L per day',(current_date + 20),
 '00000000-0000-4000-8000-000000000005',
 array['Acting','Modeling','English'],
 '2+ years','open',56,'2026-02-15T10:00:00Z'),

('cc400000-0000-4000-8000-000000000004',
 'Editor for Web Series',
 'Need a skilled editor for a 6-episode web series. Proficiency in DaVinci Resolve or Premiere Pro required. Fast turnaround needed.',
 'Editor','web_series','City Lights',
 'Remote','Per episode basis',(current_date + 60),
 '00000000-0000-4000-8000-000000000004',
 array['Editing','DaVinci Resolve','Color Grading','Sound Sync'],
 '3+ years','open',18,'2026-02-18T10:00:00Z'),

('cc500000-0000-4000-8000-000000000005',
 'Fresh Faces for Theatre Production',
 'Open audition for a contemporary Hindi play. Looking for actors aged 20-40 with theatre background. No prior film experience needed.',
 'Theatre Actor','theatre','Rang Manch',
 'Delhi, India','Monthly stipend + performance bonus',(current_date + 75),
 '00000000-0000-4000-8000-000000000005',
 array['Theatre','Hindi','Stage Presence','Improvisation'],
 'Open to freshers','open',42,'2026-02-20T10:00:00Z');

-- ────────────────────────────────────────────────────────────
-- APPLICATIONS (Alex Rivera applied to cc-1 and cc-4)
-- Disable both application triggers for the seed:
--   • on_application_created — would double-count applicant_count (seeded directly)
--   • trg_check_application_open (migration 0006) — enforces the app's
--     "call open + deadline not passed" rule, which we bypass while seeding
--     historical data.
-- ────────────────────────────────────────────────────────────
alter table public.applications disable trigger on_application_created;
alter table public.applications disable trigger trg_check_application_open;

insert into public.applications (id, casting_call_id, applicant_id, status, note, applied_at) values
  ('a1100000-0000-4000-8000-000000000001',
   'cc100000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000000',
   'shortlisted','Strong audition tape submitted','2026-02-12T10:00:00Z'),

  ('a2100000-0000-4000-8000-000000000002',
   'cc400000-0000-4000-8000-000000000004',
   '00000000-0000-4000-8000-000000000000',
   'applied','','2026-02-19T14:00:00Z');

alter table public.applications enable trigger trg_check_application_open;
alter table public.applications enable trigger on_application_created;

-- ────────────────────────────────────────────────────────────
-- MESSAGES (3 conversations involving Alex Rivera)
-- ────────────────────────────────────────────────────────────
insert into public.messages (id, sender_id, receiver_id, content, read, created_at) values

-- conv-1: Alex ↔ Neha Agarwal
('bb100000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000005',
 '00000000-0000-4000-8000-000000000000',
 'Hi! I saw your profile and I think you would be great for the period drama we are casting.',
 true,'2026-02-21T10:00:00Z'),

('bb100000-0000-4000-8000-000000000002',
 '00000000-0000-4000-8000-000000000000',
 '00000000-0000-4000-8000-000000000005',
 'Thank you! I would love to learn more about the role and project.',
 true,'2026-02-21T10:15:00Z'),

('bb100000-0000-4000-8000-000000000003',
 '00000000-0000-4000-8000-000000000005',
 '00000000-0000-4000-8000-000000000000',
 'The project is a feature film set in pre-independence India. The lead role requires strong emotional range.',
 true,'2026-02-21T11:00:00Z'),

('bb100000-0000-4000-8000-000000000004',
 '00000000-0000-4000-8000-000000000000',
 '00000000-0000-4000-8000-000000000005',
 'That sounds incredibly exciting. I have experience with period dramas and would be very interested.',
 true,'2026-02-21T11:30:00Z'),

('bb100000-0000-4000-8000-000000000005',
 '00000000-0000-4000-8000-000000000005',
 '00000000-0000-4000-8000-000000000000',
 'We would like to schedule your audition for next week.',
 false,'2026-02-22T09:30:00Z'),

-- conv-2: Alex ↔ Kavita Productions
('bb100000-0000-4000-8000-000000000006',
 '00000000-0000-4000-8000-000000000000',
 '00000000-0000-4000-8000-000000000004',
 'Hello, I applied for the Editor role for City Lights. Looking forward to hearing from you.',
 true,'2026-02-20T14:00:00Z'),

('bb100000-0000-4000-8000-000000000007',
 '00000000-0000-4000-8000-000000000004',
 '00000000-0000-4000-8000-000000000000',
 'Thank you for your application. We are reviewing your portfolio.',
 true,'2026-02-21T16:45:00Z'),

-- conv-3: Alex ↔ Rohan Kapoor
('bb100000-0000-4000-8000-000000000008',
 '00000000-0000-4000-8000-000000000003',
 '00000000-0000-4000-8000-000000000000',
 'Hey! I noticed you are also based in Mumbai. I am working on a short film and looking for collaborators.',
 true,'2026-02-20T13:00:00Z'),

('bb100000-0000-4000-8000-000000000009',
 '00000000-0000-4000-8000-000000000000',
 '00000000-0000-4000-8000-000000000003',
 'That sounds interesting! What genre is the short film?',
 true,'2026-02-20T13:45:00Z'),

('bb100000-0000-4000-8000-000000000010',
 '00000000-0000-4000-8000-000000000003',
 '00000000-0000-4000-8000-000000000000',
 'Would love to collaborate on the short film project!',
 false,'2026-02-20T14:20:00Z');

-- ────────────────────────────────────────────────────────────
-- CREW BASKET (Alex Rivera's sample basket)
-- ────────────────────────────────────────────────────────────
insert into public.crew_baskets (id, owner_id, project_name, created_at) values
  ('cb100000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000000',
   'My Production','2026-02-22T10:00:00Z');

insert into public.crew_basket_items (basket_id, profile_id, assigned_role, added_at) values
  ('cb100000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Cinematographer','2026-02-22T10:05:00Z'),
  ('cb100000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000007','Editor',          '2026-02-22T10:06:00Z'),
  ('cb100000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000014','Choreographer',   '2026-02-22T10:07:00Z');

-- ────────────────────────────────────────────────────────────
-- DONE ✓
-- Login to test: alex.rivera@email.com / Test@1234
-- ────────────────────────────────────────────────────────────
