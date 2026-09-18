import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "ar" | "fr";

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  en: {
    brand_tag: "Ready websites for real businesses",
    hero_title_1: "Buy a finished website.",
    hero_title_2: "Launch it as yours.",
    hero_sub:
      "A personal showroom of ready-made websites. Choose by type, pay once, and receive your site with clear ownership and support to go live.",
    explore_collection: "Browse websites",
    how_it_works: "How it works",
    trust_source: "Source included",
    trust_ownership: "You own it",
    trust_instance: "Clear handover",
    trust_payment: "One-time payment",
    collection: "The collection",
    curated: "Websites ready to own",
    curated_sub: "Each product is a complete website you can adapt to your brand and launch quickly.",
    search_placeholder: "Search websites…",
    all: "All",
    no_match: "No websites match your filters yet.",
    clear_filters: "Clear filters",
    inspect: "View details",
    ready_to_own: "ready to own",
    live_demo: "Live demo",
    approach: "Why this store",
    approach_title: "Simple path from choose to launch",
    principle_1_title: "Finished websites",
    principle_1_body:
      "Not empty templates. Each item is a complete site structure you can brand and publish.",
    principle_2_title: "Clear ownership",
    principle_2_body:
      "You get the source and license for your project. Your site is yours after delivery.",
    principle_3_title: "Practical delivery",
    principle_3_body:
      "Pay once → receive access → we help you go live. No hidden traps.",
    delivery: "How delivery works",
    delivery_title: "From payment to your live site",
    step_1: "Choose a website",
    step_1_body: "Filter by type, open the details, check what is included.",
    step_2: "Pay securely",
    step_2_body: "Checkout with Chargily (DZD), Stripe or PayPal.",
    step_3: "Your independent copy is created",
    step_3_body: "A private copy of the site is created and deployed automatically after payment is verified.",
    step_4: "Go live",
    step_4_body: "Publish on your domain with your content. Support available for launch.",
    quieter_title: "A calmer way to buy a website.",
    quieter_body:
      "No endless template noise. A focused catalog, visible details, and a straight path from “this fits” to “it is mine”.",
    browse_systems: "Browse websites",
    footer_line: "A personal store for ready websites built to launch.",
    customer_access: "Customer area",
    nav_collection: "Collection",
    nav_approach: "Approach",
    nav_handover: "Delivery",
    sign_in: "Sign in",
    explore: "Explore",
    owner_space: "Owner space",
    my_space: "My space",
    guarantee: "Launch support",
    guarantee_body: "Clear license · Source delivered · Access when ready",
    buy_now: "Buy this website",
    open_demo: "Open live demo",
    features: "What you get",
    tech: "Tech stack",
    faq: "FAQ",
    license: "License",
    included: "Included",
    requirements: "What you need",
    reviews: "Reviews",
    back: "Back to collection",
    loading: "Loading…",
    not_found: "Website not found.",
    return_home: "Back home",
    pay_stripe: "Pay by card (Stripe)",
    pay_chargily: "Pay in DZD (Chargily)",
    pay_paypal: "Pay with PayPal",
    sign_in_to_buy: "Sign in to buy",
    gallery: "Gallery",
    why_numi: "Why this store",
  },
  ar: {
    brand_tag: "مواقع جاهزة لمشاريع حقيقية",
    hero_title_1: "اختر موقعاً جاهزاً.",
    hero_title_2: "وأطلقه باسمك.",
    hero_sub:
      "متجر شخصي لمواقع مكتملة. تصفّح حسب النوع، ادفع مرة واحدة، واستلم موقعك مع ملكية واضحة ودعم للإطلاق.",
    explore_collection: "تصفّح المواقع",
    how_it_works: "كيف يعمل",
    trust_source: "الكود المصدري مشمول",
    trust_ownership: "الملكية لك",
    trust_instance: "تسليم واضح",
    trust_payment: "دفعة واحدة",
    collection: "المجموعة",
    curated: "مواقع جاهزة للتملك",
    curated_sub: "كل منتج موقع كامل يمكن تكييفه مع علامتك وإطلاقه بسرعة.",
    search_placeholder: "ابحث عن موقع…",
    all: "الكل",
    no_match: "لا توجد مواقع مطابقة حالياً.",
    clear_filters: "مسح التصفية",
    inspect: "عرض التفاصيل",
    ready_to_own: "جاهز للتملك",
    live_demo: "تجربة حية",
    approach: "لماذا هذا المتجر",
    approach_title: "مسار بسيط من الاختيار إلى الإطلاق",
    principle_1_title: "مواقع مكتملة",
    principle_1_body: "ليست قوالب فارغة. كل عنصر بنية موقع جاهزة تضع عليها هويتك.",
    principle_2_title: "ملكية واضحة",
    principle_2_body: "تحصل على المصدر والرخصة لمشروعك. الموقع لك بعد التسليم.",
    principle_3_title: "تسليم عملي",
    principle_3_body: "ادفع مرة → تُنشأ نسختك المستقلة → نساعدك تطلق. بدون مفاجآت.",
    delivery: "مسار التسليم",
    delivery_title: "من الدفع إلى موقعك على الإنترنت",
    step_1: "اختر الموقع",
    step_1_body: "صفّ حسب النوع، افتح التفاصيل، وتأكد ماذا يشمله.",
    step_2: "ادفع بأمان",
    step_2_body: "Chargily بالدينار، أو Stripe / PayPal.",
    step_3: "تُنشأ نسختك المستقلة",
    step_3_body: "بعد تأكيد الدفع تُنشأ نسخة خاصة من الموقع وتُنشر تلقائياً.",
    step_4: "انشر موقعك",
    step_4_body: "على نطاقك وبمحتواك. دعم متاح لمرحلة الإطلاق.",
    quieter_title: "طريقة أهدأ لشراء موقع.",
    quieter_body:
      "بدون فوضى القوالب. كتالوج مركّز، تفاصيل ظاهرة، ومسار واضح من «هذا يناسبني» إلى «صار لي».",
    browse_systems: "تصفّح المواقع",
    footer_line: "متجر شخصي لمواقع جاهزة للإطلاق.",
    customer_access: "مساحة الزبون",
    nav_collection: "المجموعة",
    nav_approach: "النهج",
    nav_handover: "التسليم",
    sign_in: "تسجيل الدخول",
    explore: "استكشف",
    owner_space: "لوحة المالك",
    my_space: "مساحتي",
    guarantee: "دعم الإطلاق",
    guarantee_body: "رخصة واضحة · تسليم المصدر · الوصول عند الجاهزية",
    buy_now: "اشترِ هذا الموقع",
    open_demo: "فتح التجربة الحية",
    features: "ماذا تحصل عليه",
    tech: "التقنيات",
    faq: "أسئلة شائعة",
    license: "الرخصة",
    included: "مشمول",
    requirements: "ماذا تحتاج",
    reviews: "التقييمات",
    back: "العودة للمجموعة",
    loading: "جاري التحميل…",
    not_found: "الموقع غير موجود.",
    return_home: "العودة للرئيسية",
    pay_stripe: "الدفع بالبطاقة (Stripe)",
    pay_chargily: "الدفع بالدينار (Chargily)",
    pay_paypal: "الدفع عبر PayPal",
    sign_in_to_buy: "سجّل الدخول للشراء",
    gallery: "المعرض",
    why_numi: "لماذا هذا المتجر",
  },
  fr: {
    brand_tag: "Des sites prêts pour de vrais projets",
    hero_title_1: "Achetez un site terminé.",
    hero_title_2: "Lancez-le à votre nom.",
    hero_sub:
      "Une boutique personnelle de sites prêts. Choisissez par type, payez une fois, et recevez votre site avec une propriété claire et un accompagnement au lancement.",
    explore_collection: "Parcourir les sites",
    how_it_works: "Comment ça marche",
    trust_source: "Code source inclus",
    trust_ownership: "C’est à vous",
    trust_instance: "Remise claire",
    trust_payment: "Paiement unique",
    collection: "La collection",
    curated: "Sites prêts à posséder",
    curated_sub: "Chaque produit est un site complet à adapter à votre marque et à publier rapidement.",
    search_placeholder: "Rechercher un site…",
    all: "Tous",
    no_match: "Aucun site ne correspond pour le moment.",
    clear_filters: "Effacer les filtres",
    inspect: "Voir les détails",
    ready_to_own: "prêt à posséder",
    live_demo: "Démo live",
    approach: "Pourquoi cette boutique",
    approach_title: "Un chemin simple du choix au lancement",
    principle_1_title: "Sites terminés",
    principle_1_body:
      "Pas de templates vides. Chaque item est une structure de site complète à brandir et publier.",
    principle_2_title: "Propriété claire",
    principle_2_body:
      "Vous recevez le source et la licence pour votre projet. Le site vous appartient après livraison.",
    principle_3_title: "Livraison pratique",
    principle_3_body: "Payez une fois → recevez le pack → on vous aide à mettre en ligne.",
    delivery: "Parcours de livraison",
    delivery_title: "Du paiement à votre site en ligne",
    step_1: "Choisissez un site",
    step_1_body: "Filtrez par type, ouvrez les détails, vérifiez le contenu.",
    step_2: "Payez en sécurité",
    step_2_body: "Chargily (DZD), Stripe ou PayPal.",
    step_3: "Votre copie indépendante est créée",
    step_3_body: "Une copie privée du site est créée et déployée automatiquement après vérification du paiement.",
    step_4: "Mettez en ligne",
    step_4_body: "Sur votre domaine, avec votre contenu. Support de lancement disponible.",
    quieter_title: "Une façon plus calme d’acheter un site.",
    quieter_body:
      "Pas de bruit de templates. Un catalogue ciblé, des détails visibles, et un chemin clair.",
    browse_systems: "Parcourir les sites",
    footer_line: "Une boutique personnelle de sites prêts à lancer.",
    customer_access: "Espace client",
    nav_collection: "Collection",
    nav_approach: "Approche",
    nav_handover: "Livraison",
    sign_in: "Connexion",
    explore: "Explorer",
    owner_space: "Espace propriétaire",
    my_space: "Mon espace",
    guarantee: "Support lancement",
    guarantee_body: "Licence claire · Source livré · Accès quand prêt",
    buy_now: "Acheter ce site",
    open_demo: "Ouvrir la démo live",
    features: "Ce que vous obtenez",
    tech: "Stack technique",
    faq: "FAQ",
    license: "Licence",
    included: "Inclus",
    requirements: "Prérequis",
    reviews: "Avis",
    back: "Retour à la collection",
    loading: "Chargement…",
    not_found: "Site introuvable.",
    return_home: "Retour à l’accueil",
    pay_stripe: "Payer par carte (Stripe)",
    pay_chargily: "Payer en DZD (Chargily)",
    pay_paypal: "Payer avec PayPal",
    sign_in_to_buy: "Connectez-vous pour acheter",
    gallery: "Galerie",
    why_numi: "Pourquoi cette boutique",
  },
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = localStorage.getItem("numi_locale") as Locale | null;
    return saved === "ar" || saved === "fr" || saved === "en" ? saved : "ar";
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("numi_locale", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
      dir: locale === "ar" ? "rtl" : "ltr",
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
