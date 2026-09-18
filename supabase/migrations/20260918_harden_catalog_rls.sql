-- NUMI post-schema hardening for Supabase.
-- Drizzle owns the base schema; this migration only enables RLS and public catalog read policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tech_stack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_published_categories ON public.categories;
CREATE POLICY public_read_published_categories ON public.categories
  FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS public_read_published_products ON public.products;
CREATE POLICY public_read_published_products ON public.products
  FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS public_read_product_images ON public.product_images;
CREATE POLICY public_read_product_images ON public.product_images
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images."productId" AND p.status = 'published'
  ));

DROP POLICY IF EXISTS public_read_product_features ON public.product_features;
CREATE POLICY public_read_product_features ON public.product_features
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_features."productId" AND p.status = 'published'
  ));

DROP POLICY IF EXISTS public_read_product_tech_stack ON public.product_tech_stack;
CREATE POLICY public_read_product_tech_stack ON public.product_tech_stack
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_tech_stack."productId" AND p.status = 'published'
  ));

DROP POLICY IF EXISTS public_read_product_versions ON public.product_versions;
CREATE POLICY public_read_product_versions ON public.product_versions
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_versions."productId" AND p.status = 'published'
  ));

DROP POLICY IF EXISTS public_read_product_media ON public.product_media;
CREATE POLICY public_read_product_media ON public.product_media
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_media."productId" AND p.status = 'published'
  ));

DROP POLICY IF EXISTS public_read_published_reviews ON public.reviews;
CREATE POLICY public_read_published_reviews ON public.reviews
  FOR SELECT TO anon, authenticated USING (status = 'published');
