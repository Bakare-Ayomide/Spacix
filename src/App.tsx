/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  CreditCard,
  Folder,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { RoutePath, StudioProvider, useRuns } from './lib/useRuns';
import { StudioGeneratorView } from './components/StudioGeneratorView';
import {
  AccountBillingPage,
  AdminConsolePage,
  AssetsLibraryPage,
  CommunityPage,
  EffectsPage,
  ExplorePage,
  LegalPage,
  PricingPage,
} from './components/StudioPages';
import {
  CanvasStudioView,
  CharacterStudioView,
  CinemaStudioView,
  EditingStudioView,
  LipSyncStudioView,
  LocationStudioView,
  MarketingStudioView,
  MotionStudioView,
  PropsStudioView,
  SPACI6X_STUDIOS,
  StoryboardStudioView,
  WardrobeStudioView,
} from './components/ContinuityStudiosView';
import {
  AuthMagicLinkModal,
  GenerationDetailModal,
  UpgradeCreditsModal,
} from './components/StudioModals';
import { MediaLightbox } from './components/MediaLightbox';
import { AuthPage } from './components/AuthPage';
import { SpacixLogo } from './components/ProviderBrandIcon';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/primitives';

const PRIMARY_NAV_ITEMS: Array<{
  id: string;
  label: string;
  route: RoutePath;
  params?: Record<string, string>;
}> = [
  { id: 'home', label: 'Home', route: 'explore' },
  { id: 'cinema', label: 'Cinema Studio', route: 'cinema' },
  { id: 'projects', label: 'My Projects', route: 'cinema', params: { tab: 'projects' } },
  { id: 'elements', label: 'My Elements', route: 'cinema', params: { tab: 'elements' } },
  { id: 'favorites', label: 'My Favorites', route: 'cinema', params: { tab: 'favorites' } },
  { id: 'community', label: 'Community', route: 'community' },
];

const StudioShell: React.FC = () => {
  const {
    route,
    routeParams,
    navigate,
    user,
    notifications,
    setUpgradeModalOpen,
    logout,
    updateUserCredits,
    lightboxItem,
    setLightboxItem,
    toastMessage,
  } = useRuns();

  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [customSubCredits, setCustomSubCredits] = useState<string>('');
  const [customTopupCredits, setCustomTopupCredits] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);
  const [cookieConsent, setCookieConsent] = useState<string | null>(() => {
    try {
      return localStorage.getItem('spacix_cookie_consent');
    } catch {
      return 'accepted';
    }
  });

  // Connect global toast state with Sonner notification system
  useEffect(() => {
    if (toastMessage) {
      toast(toastMessage, {
        style: {
          background: '#14161D',
          border: '1px solid rgba(70, 236, 213, 0.35)',
          color: '#FAFAFA',
        },
      });
    }
  }, [toastMessage]);

  const handleCookieChoice = (choice: 'accepted' | 'essential') => {
    try {
      localStorage.setItem('spacix_cookie_consent', choice);
    } catch {
      // ignore storage error
    }
    setCookieConsent(choice);
  };

  const visibleNotification = notifications.find((n) => {
    if (!n.active || dismissedNotifIds.includes(n.id)) return false;
    if (n.targetAudience === 'all') return true;
    if (n.targetAudience === 'admins') return user?.role === 'admin';
    if (n.targetAudience === 'free') return !user || user.plan === 'free';
    if (n.targetAudience === 'paid') return Boolean(user && user.plan !== 'free');
    return true;
  });

  const isNavItemActive = (item: (typeof PRIMARY_NAV_ITEMS)[number]) => {
    if (item.id === 'home') return route === 'explore';
    if (item.id === 'community') return route === 'community';
    const isStudioRoute = SPACI6X_STUDIOS.some((s) => s.id === route);
    if (!isStudioRoute) return false;
    const currentTab = routeParams.tab || 'studio';
    if (item.id === 'projects') return currentTab === 'projects';
    if (item.id === 'elements') return currentTab === 'elements';
    if (item.id === 'favorites') return currentTab === 'favorites';
    if (item.id === 'cinema') {
      return (
        currentTab !== 'projects' &&
        currentTab !== 'elements' &&
        currentTab !== 'favorites'
      );
    }
    return false;
  };

  return (
    <TooltipProvider delayDuration={180}>
      <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
        <Toaster position="bottom-center" theme="dark" richColors />

        {/* =================================================================== */}
        {/* ACTIVE PLATFORM NOTIFICATION BROADCAST BANNER                       */}
        {/* =================================================================== */}
        {visibleNotification && (
          <div className="bg-[#11191B] border-b border-[#46ecd5]/30 px-4 py-2 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Badge variant="default" className="bg-[#46ecd5] text-zinc-950">
                {visibleNotification.type}
              </Badge>
              <span className="font-bold text-white truncate">
                {visibleNotification.title}
              </span>
              <span className="hidden md:inline text-zinc-300 truncate">
                — {visibleNotification.message}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {visibleNotification.ctaLabel && visibleNotification.ctaRoute && (
                <Button
                  variant="cyanGhost"
                  size="xs"
                  onClick={() => navigate(visibleNotification.ctaRoute as RoutePath)}
                >
                  {visibleNotification.ctaLabel} →
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() =>
                  setDismissedNotifIds((prev) => [...prev, visibleNotification.id])
                }
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* GLOBAL TOP NAVIGATION BAR (Minimal Unified Navigation + Radix UI)   */}
        {/* =================================================================== */}
        <header className="sticky top-0 z-40 h-16 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 lg:gap-8 max-w-full">
          {/* Zone 1: Single-line Brand Wordmark / Logo */}
          <button
            onClick={() => navigate('explore')}
            aria-label="SPACIX Home"
            className="flex items-center hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SpacixLogo size="md" />
          </button>

          {/* Zone 2: Minimal Main Navigation Links with Framer Motion Layout Pill */}
          <nav className="hidden lg:flex items-center gap-1.5 rounded-2xl bg-[#111319] p-1 border border-white/[0.07]">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.route, item.params)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer z-10 ${
                    active ? 'text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="spacix-top-nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-xl bg-[#46ecd5] shadow-[0_0_20px_rgba(70,236,213,0.3)]"
                    />
                  )}
                  {item.label}
                </button>
              );
            })}
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('admin')}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer z-10 ${
                  route === 'admin'
                    ? 'text-zinc-950'
                    : 'text-[#46ecd5]/85 hover:text-[#46ecd5]'
                }`}
              >
                {route === 'admin' && (
                  <motion.span
                    layoutId="spacix-top-nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-[#46ecd5]"
                  />
                )}
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Radix Popover Credit Wallet + Radix Dropdown Account Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {user ? (
              <>
                <Popover
                  open={creditPopoverOpen}
                  onOpenChange={(open) => {
                    if (open) {
                      setCustomSubCredits(String(user.credits.subscription));
                      setCustomTopupCredits(String(user.credits.topup));
                    }
                    setCreditPopoverOpen(open);
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="font-mono-tabular text-[#46ecd5] border-white/12"
                        >
                          <span>✦ {user.credits.total.toLocaleString()}</span>
                          <ChevronDown className="w-3 h-3 text-zinc-400" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Studio Credit Wallet & Balance</TooltipContent>
                  </Tooltip>

                  <PopoverContent align="end" className="w-80 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <div className="font-bold text-white uppercase tracking-wider">
                          Studio Credit Wallet
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono-tabular">
                          Plan: {user.plan.toUpperCase()} ({user.billingCycle || 'monthly'})
                        </div>
                      </div>
                      <Badge variant="default">ACTIVE</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/10">
                        <div className="text-[10px] text-zinc-400 uppercase">Subscription</div>
                        <div className="font-mono-tabular font-bold text-sm text-white mt-0.5">
                          ✦ {user.credits.subscription.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0D0F14] border border-white/10">
                        <div className="text-[10px] text-zinc-400 uppercase">Top-Up Vault</div>
                        <div className="font-mono-tabular font-bold text-sm text-[#46ecd5] mt-0.5">
                          ✦ {user.credits.topup.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {user.role === 'admin' && (
                      <div className="pt-2 border-t border-white/10 space-y-2.5">
                        <div className="text-[11px] font-bold uppercase text-[#46ecd5]">
                          Admin Balance Setter (Persistent)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">
                              Subscription Cr
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={customSubCredits}
                              onChange={(e) => setCustomSubCredits(e.target.value)}
                              className="font-mono-tabular"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">
                              Top-Up Cr
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={customTopupCredits}
                              onChange={(e) => setCustomTopupCredits(e.target.value)}
                              className="font-mono-tabular"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {[0, 500, 1000, 2500, 10000].map((presetVal) => (
                            <Button
                              key={presetVal}
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setCustomSubCredits(String(presetVal));
                                setCustomTopupCredits('0');
                              }}
                              className="font-mono-tabular text-[10px]"
                            >
                              ✦ {presetVal.toLocaleString()}
                            </Button>
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            await updateUserCredits(
                              Number(customSubCredits || 0),
                              Number(customTopupCredits || 0),
                              user.id,
                              'Updated from Top Bar Wallet Popover'
                            );
                            setCreditPopoverOpen(false);
                          }}
                          className="w-full uppercase tracking-wider"
                        >
                          Save Custom Balance
                        </Button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreditPopoverOpen(false);
                          navigate('account');
                        }}
                        className="text-[11px] font-semibold text-zinc-300 hover:text-white cursor-pointer"
                      >
                        Full Credit Ledger →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreditPopoverOpen(false);
                          setUpgradeModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#46ecd5] hover:underline cursor-pointer"
                      >
                        Add Top-Up Credits
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setUpgradeModalOpen(true)}
                  className="hidden sm:inline-flex uppercase tracking-wider"
                >
                  Upgrade
                </Button>

                {/* Radix Dropdown Menu for User Account */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="Open account menu"
                      className="pl-2 pr-2.5 gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline max-w-[100px] truncate text-xs">
                        {user.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="font-bold text-white truncate">{user.name}</div>
                      <div className="text-[11px] font-mono-tabular text-zinc-400 truncate font-normal">
                        {user.email}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => navigate('assets')}>
                      <Folder className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Assets & Projects Library</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate('account')}>
                      <CreditCard className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Account & Billing Ledger</span>
                    </DropdownMenuItem>

                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('admin')}>
                        <Shield className="w-3.5 h-3.5 text-[#46ecd5]" />
                        <span>Admin Console</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-rose-400 focus:text-rose-300"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('auth')}
                className="uppercase tracking-wider"
              >
                Login / Sign Up
              </Button>
            )}

            {/* Radix Sheet for Mobile Navigation */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Toggle mobile navigation"
                  className="lg:hidden"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="space-y-5 pt-4">
                  <div className="flex items-center gap-2">
                    <SpacixLogo size="sm" />
                    <Badge variant="default">CINEMA STUDIO</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    {PRIMARY_NAV_ITEMS.map((item) => {
                      const active = isNavItemActive(item);
                      return (
                        <Button
                          key={item.id}
                          variant={active ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            navigate(item.route, item.params);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start uppercase tracking-wider"
                        >
                          {item.label}
                        </Button>
                      );
                    })}
                    <Button
                      variant={route === 'account' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        navigate('account');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start uppercase tracking-wider"
                    >
                      Account & Wallet
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        variant={route === 'admin' ? 'default' : 'cyanGhost'}
                        size="sm"
                        onClick={() => {
                          navigate('admin');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start uppercase tracking-wider"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin Console</span>
                      </Button>
                    )}
                  </div>
                </div>
                {user && (
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setUpgradeModalOpen(true);
                    }}
                    className="w-full uppercase tracking-wider"
                  >
                    Upgrade Plan / Add Credits
                  </Button>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* =================================================================== */}
        {/* MAIN ROUTE VIEWPORT                                                 */}
        {/* =================================================================== */}
        <main className="flex-1 w-full max-w-full overflow-x-clip">
          {route === 'explore' && <ExplorePage />}
          {route === 'cinema' && <CinemaStudioView />}
          {route === 'character' && <CharacterStudioView />}
          {route === 'motion' && <MotionStudioView />}
          {route === 'wardrobe' && <WardrobeStudioView />}
          {route === 'props' && <PropsStudioView />}
          {route === 'location' && <LocationStudioView />}
          {route === 'storyboard' && <StoryboardStudioView />}
          {route === 'marketing' && <MarketingStudioView />}
          {route === 'lipsync' && <LipSyncStudioView />}
          {route === 'canvas' && <CanvasStudioView />}
          {route === 'editing' && <EditingStudioView />}
          {route === 'image' && <StudioGeneratorView surface="image" />}
          {route === 'video' && <StudioGeneratorView surface="video" />}
          {route === 'audio' && <StudioGeneratorView surface="audio" />}
          {route === 'effects' && <EffectsPage />}
          {route === 'community' && <CommunityPage />}
          {route === 'assets' && <AssetsLibraryPage />}
          {route === 'pricing' && <PricingPage />}
          {route === 'account' && <AccountBillingPage />}
          {route === 'admin' && <AdminConsolePage />}
          {route === 'legal' && <LegalPage section={routeParams.section} />}
          {route === 'auth' && <AuthPage />}
        </main>

        {/* =================================================================== */}
        {/* QUIET FOOTER WITH SPACIX LOGO (Shown on non-studio pages)           */}
        {/* =================================================================== */}
        {!SPACI6X_STUDIOS.some((s) => s.id === route) && (
          <footer className="border-t border-white/10 bg-[#09090B] py-8 px-4 sm:px-6 mt-12">
            <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('explore')}
                  aria-label="SPACIX Home"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <SpacixLogo size="sm" />
                </button>
                <span>·</span>
                <span>Unified AI Cinema Studio & Automatic Film Production</span>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <button
                  onClick={() => navigate('legal', { section: 'terms' })}
                  className="hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
                <button
                  onClick={() => navigate('legal', { section: 'privacy' })}
                  className="hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => navigate('legal', { section: 'acceptable-use' })}
                  className="hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Acceptable Use
                </button>
              </div>
            </div>
          </footer>
        )}

        {/* =================================================================== */}
        {/* EU COOKIE CONSENT BANNER                                            */}
        {/* =================================================================== */}
        {!cookieConsent && (
          <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-40 p-4 rounded-2xl bg-[#141418]/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-3">
            <div className="text-xs font-semibold text-white">
              Cookie & Storage Preferences
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              SPACIX uses essential session cookies for passwordless authentication and R2 asset delivery. Optional analytics run only with your explicit consent.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => handleCookieChoice('essential')}
              >
                Reject Non-Essential
              </Button>
              <Button
                variant="default"
                size="xs"
                onClick={() => handleCookieChoice('accepted')}
              >
                Accept All
              </Button>
            </div>
          </div>
        )}

        {/* Global Modals */}
        <GenerationDetailModal />
        <AuthMagicLinkModal />
        <UpgradeCreditsModal />
        <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      </div>
    </TooltipProvider>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
