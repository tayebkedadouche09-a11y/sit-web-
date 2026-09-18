import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import { SkyModeProvider } from "./contexts/SkyModeContext";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Category from "./pages/Category";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import WhatsAppFloat from "./components/WhatsAppFloat";
import SkyCanvas from "./components/SkyCanvas";
import ProductDetail from "./pages/ProductDetail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/websites/:slug" component={ProductDetail} />
      <Route path="/categories/:slug" component={Category} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LocaleProvider>
          <SkyModeProvider>
            <TooltipProvider>
              <Toaster />
              <SkyCanvas />
              <Router />
              <WhatsAppFloat />
            </TooltipProvider>
          </SkyModeProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
