import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCode2,
  KeyRound,
  LogOut,
  PackageCheck,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import SiteNav from "@/components/SiteNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";

type PurchaseRow = {
  purchase: any;
  product: any;
  delivery: any;
  order: any;
  payment: any;
};

function labels(locale: string) {
  if (locale === "ar") {
    return {
      pending: "في انتظار الدفع",
      payment_verified: "تم التحقق من الدفع",
      paid: "تم الدفع",
      fulfilled: "تم التسليم",
      cancelled: "ملغى",
      verified: "دفع ناجح",
      failed: "فشل الدفع",
      refunded: "مسترجع",
      ready: "النسخة جاهزة",
      blocked: "التسليم متوقف",
      provisioning: "جاري تجهيز نسختك",
      license: "الرخصة",
      licensePending: "الرخصة قيد الإصدار",
      openSite: "افتح نسختي",
      myPurchases: "مشترياتي",
      subtitle: "هنا تجد حالة الدفع والنسخة المستقلة بعد التأكيد.",
      signOut: "خروج",
      loading: "جاري التحميل…",
      empty: "لا توجد مشتريات بعد.",
      explore: "تصفّح المواقع",
      successBanner: "تمت عملية الدفع. ستظهر حالة التجهيز هنا بعد التأكيد.",
      cancelBanner: "تم إلغاء الدفع. لم يُمنح أي وصول.",
      loadError: "تعذّر تحميل المشتريات. أعد المحاولة بعد لحظات.",
    };
  }
  if (locale === "fr") {
    return {
      pending: "Paiement en attente",
      payment_verified: "Paiement vérifié",
      paid: "Payé",
      fulfilled: "Livré",
      cancelled: "Annulé",
      verified: "Paiement réussi",
      failed: "Échec",
      refunded: "Remboursé",
      ready: "Instance prête",
      blocked: "Livraison bloquée",
      provisioning: "Préparation en cours",
      license: "Licence",
      licensePending: "Licence en cours",
      openSite: "Ouvrir mon site",
      myPurchases: "Mes achats",
      subtitle: "Suivez le paiement et votre copie indépendante ici.",
      signOut: "Déconnexion",
      loading: "Chargement…",
      empty: "Aucun achat pour le moment.",
      explore: "Parcourir les sites",
      successBanner: "Paiement renvoyé avec succès. Le statut apparaîtra après confirmation.",
      cancelBanner: "Paiement annulé. Aucun accès accordé.",
      loadError: "Impossible de charger les achats.",
    };
  }
  return {
    pending: "Payment pending",
    payment_verified: "Payment verified",
    paid: "Paid",
    fulfilled: "Delivered",
    cancelled: "Cancelled",
    verified: "Payment successful",
    failed: "Payment failed",
    refunded: "Refunded",
    ready: "Instance ready",
    blocked: "Delivery blocked",
    provisioning: "Provisioning your copy",
    license: "License",
    licensePending: "License pending",
    openSite: "Open my site",
    myPurchases: "My purchases",
    subtitle: "Track payment status and your independent website copy here.",
    signOut: "Sign out",
    loading: "Loading…",
    empty: "No purchases yet.",
    explore: "Browse websites",
    successBanner: "Checkout returned successfully. Delivery progress appears after confirmation.",
    cancelBanner: "Checkout cancelled. No delivery access was granted.",
    loadError: "Could not load purchases. Try again shortly.",
  };
}

function PurchaseCard({
  row,
  download,
  L,
}: {
  row: PurchaseRow;
  download: ReturnType<typeof trpc.purchases.download.useMutation>;
  L: ReturnType<typeof labels>;
}) {
  const { purchase, product, delivery, order, payment } = row;
  const ready = delivery?.status === "ready" && purchase.accessGranted;
  const blocked = delivery?.status === "blocked";
  const deliveryState = ready ? L.ready : blocked ? L.blocked : L.provisioning;
  const deliveryTone = ready
    ? "bg-emerald-400/10 text-emerald-300"
    : blocked
      ? "bg-red-400/10 text-red-300"
      : "bg-[#ef8b65]/10 text-[#f2a789]";

  return (
    <article className="glass rounded-[24px] p-6 md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex gap-4">
          <img
            src={product.heroImage}
            alt=""
            className="h-20 w-24 rounded-xl object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold text-white md:text-2xl">{product.name}</h2>
            <p className="mt-1 text-sm text-white/45">
              {new Date(purchase.purchasedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] ${deliveryTone}`}
        >
          {ready ? <CheckCircle2 size={13} /> : blocked ? <XCircle size={13} /> : <Clock3 size={13} />}
          {deliveryState}
        </span>
      </div>

      {ready && delivery?.instanceUrl ? (
        <a
          href={delivery.instanceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#3b8bff] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:w-auto"
        >
          {L.openSite}
          <ExternalLink size={15} />
        </a>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3.5 text-xs text-white/60">
          <ShieldCheck size={15} className="text-[#83c2ff]" />
          {(L as any)[payment?.status ?? "pending"] ?? payment?.status}
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3.5 text-xs text-white/60">
          <PackageCheck size={15} className="text-[#83c2ff]" />
          {(L as any)[order?.status ?? "pending"] ?? order?.status}
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3.5 text-xs text-white/60">
          <KeyRound size={15} className="text-[#83c2ff]" />
          {purchase.licenseKey ? L.license : L.licensePending}
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-3.5 text-xs text-white/60">
          <FileCode2 size={15} className="text-[#83c2ff]" />
          {ready ? "OK" : "…"}
        </div>
      </div>

      {purchase.licenseKey ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-xs text-white/70">
          {purchase.licenseKey}
        </div>
      ) : null}

      {ready ? (
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => download.mutate({ purchaseId: purchase.id, kind: "source" })}
            className="flex items-center gap-2 text-sm text-[#83c2ff]"
          >
            <Download size={14} /> Source
          </button>
          <button
            type="button"
            onClick={() => download.mutate({ purchaseId: purchase.id, kind: "documentation" })}
            className="flex items-center gap-2 text-sm text-[#83c2ff]"
          >
            <Download size={14} /> Docs
          </button>
          <button
            type="button"
            onClick={() => download.mutate({ purchaseId: purchase.id, kind: "license" })}
            className="flex items-center gap-2 text-sm text-[#83c2ff]"
          >
            <Download size={14} /> License
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default function Account() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { locale, dir } = useLocale();
  const L = labels(locale);

  const purchasesQuery = trpc.purchases.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 8000,
  });
  const notificationsQuery = trpc.purchases.notifications.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const download = trpc.purchases.download.useMutation({
    onSuccess: (data) => {
      if (data?.url) window.open(data.url, "_blank");
      else toast.message("Download prepared");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // stay on page messaging
    }
  }, [loading, isAuthenticated]);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const checkout = params.get("checkout");

  return (
    <div className="numi-shell numi-shell--calm" dir={dir}>
      <div className="numi-content">
        <SiteNav />
        <main className="mx-auto max-w-[1100px] px-5 py-12 md:px-10 md:py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{L.myPurchases}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/50">{L.subtitle}</p>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-2 self-start rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/55 transition-colors hover:border-white/40 hover:text-white"
              >
                <LogOut size={14} /> {L.signOut}
              </button>
            ) : null}
          </div>

          {checkout === "success" && (
            <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm text-emerald-100">
              {L.successBanner}
            </div>
          )}
          {checkout === "cancelled" && (
            <div className="mt-8 rounded-2xl border border-[#ef8b65]/20 bg-[#ef8b65]/10 p-5 text-sm text-[#f6c0aa]">
              {L.cancelBanner}
            </div>
          )}

          {notificationsQuery.data?.length ? (
            <section className="mt-8 grid gap-3 md:grid-cols-3">
              {notificationsQuery.data.slice(0, 3).map((notification: any) => (
                <article key={notification.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-[#83c2ff]">
                    <Bell size={14} />
                    <span className="text-xs font-semibold text-white">{notification.title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/45">{notification.body}</p>
                </article>
              ))}
            </section>
          ) : null}

          <section className="mt-12">
            {!isAuthenticated ? (
              <div className="glass rounded-[24px] p-10">
                <p className="text-white/60">{L.subtitle}</p>
                <Link href="/" className="mt-4 inline-flex text-sm text-[#83c2ff]">
                  {L.explore} <ArrowRight size={14} className="ms-1" />
                </Link>
              </div>
            ) : purchasesQuery.isLoading ? (
              <div className="glass rounded-[24px] p-10 text-white/50">{L.loading}</div>
            ) : purchasesQuery.isError ? (
              <div className="glass rounded-[24px] border-red-400/20 p-10 text-white/70">{L.loadError}</div>
            ) : purchasesQuery.data?.length ? (
              <div className="space-y-5">
                {purchasesQuery.data.map((row: PurchaseRow) => (
                  <PurchaseCard key={row.purchase.id} row={row} download={download} L={L} />
                ))}
              </div>
            ) : (
              <div className="glass rounded-[24px] p-10">
                <h2 className="text-2xl font-semibold text-white">{L.empty}</h2>
                <Link href="/#collection" className="mt-6 inline-flex items-center gap-2 text-sm text-[#83c2ff]">
                  {L.explore} <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
