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
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import WhatsAppFloat from "./components/WhatsAppFloat";
import ProductDetail from "./pages/ProductDetail";
import SpaceAudioPanel from "./components/SpaceAudioPanel";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/websites/:slug" component={ProductDetail} />
      <Route path="/categories/:slug" component={Category} />
      <Route path="/account" component={Account} />
      <Route path="/numi-owner-console-9x7k2" component={Admin} />
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
              <Router />
              <SpaceAudioPanel />
              <WhatsAppFloat />
            </TooltipProvider>
          </SkyModeProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
