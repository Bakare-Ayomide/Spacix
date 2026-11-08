/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  AuthMagicLinkModal,
  GenerationDetailModal,
  UpgradeCreditsModal,
} from './components/StudioModals';
import { AuthPage } from './components/AuthPage';
import { SpacixLogo } from './components/ProviderBrandIcon';

const NAV_ITEMS: { route: RoutePath; label: string }[] = [
  { route: 'explore', label: 'Explore' },
  { route: 'image', label: 'Image' },
  { route: 'video', label: 'Video' },
  { route: 'audio', label: 'Audio' },
  { route: 'effects', label: 'Effects' },
  { route: 'community', label: 'Community' },
  { route: 'pricing', label: 'Pricing' },
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
    toastMessage,
  } = useRuns();

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* =================================================================== */}
      {/* ACTIVE PLATFORM NOTIFICATION BROADCAST BANNER                       */}
      {/* =================================================================== */}
      {visibleNotification && (
        <div className="bg-[#11191B] border-b border-[#46ecd5]/30 px-4 py-2 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2 py-0.5 rounded bg-[#46ecd5] text-zinc-950 font-mono-tabular font-extrabold text-[10px] uppercase shrink-0">
              {visibleNotification.type}
            </span>
            <span className="font-bold text-white truncate">
              {visibleNotification.title}
            </span>
            <span className="hidden md:inline text-zinc-300 truncate">
              — {visibleNotification.message}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {visibleNotification.ctaLabel && visibleNotification.ctaRoute && (
              <button
                onClick={() => navigate(visibleNotification.ctaRoute as RoutePath)}
                className="px-2.5 py-1 rounded bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/40 text-[#46ecd5] font-bold text-[11px]"
              >
                {visibleNotification.ctaLabel} →
              </button>
            )}
            <button
              onClick={() =>
                setDismissedNotifIds((prev) => [...prev, visibleNotification.id])
              }
              aria-label="Dismiss notification"
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* GLOBAL TOP NAVIGATION BAR (3-Zone Top Bar Contract)                 */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 h-16 bg-[#09090B]/90 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 lg:gap-8 max-w-full">
        {/* Zone 1: Single-line Brand Wordmark / Logo */}
        <button
          onClick={() => navigate('explore')}
          aria-label="SPACIX Home"
          className="flex items-center hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <SpacixLogo size="md" />
        </button>

        {/* Zone 2: Primary Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {NAV_ITEMS.map((item) => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  active
                    ? 'text-[#46ecd5] border-[#46ecd5]'
                    : 'border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('admin')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 ${
                route === 'admin'
                  ? 'text-[#46ecd5] border-[#46ecd5]'
                  : 'border-transparent text-[#46ecd5]/85 hover:text-[#46ecd5]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Account / Upgrade Primary Action */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <>
              <div className="relative">
                <button
                  onClick={() => {
                    setCustomSubCredits(String(user.credits.subscription));
                    setCustomTopupCredits(String(user.credits.topup));
                    setCreditPopoverOpen((prev) => !prev);
                    setAvatarMenuOpen(false);
                  }}
                  title="Click to inspect or adjust credit buckets"
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1C1C22] border border-white/10 text-xs font-mono-tabular font-semibold text-[#46ecd5] whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  <span>✦ {user.credits.total.toLocaleString()}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {creditPopoverOpen && (
                  <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-xl bg-[#141418] border border-white/15 shadow-2xl p-4 z-50 text-xs space-y-3.5 max-h-[82vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <div className="font-bold text-white uppercase tracking-wider">
                          Studio Credit Wallet
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono-tabular">
                          Plan: {user.plan.toUpperCase()} ({user.billingCycle || 'monthly'})
                        </div>
                      </div>
                      <button
                        onClick={() => setCreditPopoverOpen(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-white/10">
                        <div className="text-[10px] text-zinc-400 uppercase">Subscription</div>
                        <div className="font-mono-tabular font-bold text-sm text-white mt-0.5">
                          ✦ {user.credits.subscription.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-white/10">
                        <div className="text-[10px] text-zinc-400 uppercase">Top-Up Vault</div>
                        <div className="font-mono-tabular font-bold text-sm text-[#46ecd5] mt-0.5">
                          ✦ {user.credits.topup.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {user.role === 'admin' && (
                      <div className="pt-2 border-t border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-[#46ecd5]">
                            Admin Balance Setter (Persistent)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">
                              Subscription Cr
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={customSubCredits}
                              onChange={(e) => setCustomSubCredits(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">
                              Top-Up Cr
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={customTopupCredits}
                              onChange={(e) => setCustomTopupCredits(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {[0, 500, 1000, 2500, 10000].map((presetVal) => (
                            <button
                              key={presetVal}
                              type="button"
                              onClick={() => {
                                setCustomSubCredits(String(presetVal));
                                setCustomTopupCredits('0');
                              }}
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10px] font-mono-tabular text-zinc-300"
                            >
                              ✦ {presetVal.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            await updateUserCredits(
                              Number(customSubCredits || 0),
                              Number(customTopupCredits || 0),
                              user.id,
                              'Updated from Top Bar Wallet Popover'
                            );
                            setCreditPopoverOpen(false);
                          }}
                          className="w-full py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider hover:brightness-105"
                        >
                          Save Custom Balance
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreditPopoverOpen(false);
                          navigate('account');
                        }}
                        className="text-[11px] font-semibold text-zinc-300 hover:text-white"
                      >
                        Full Credit Ledger →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreditPopoverOpen(false);
                          setUpgradeModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#46ecd5] hover:underline"
                      >
                        Add Top-Up Credits
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setUpgradeModalOpen(true)}
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 transition-all whitespace-nowrap shrink-0"
              >
                Upgrade
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    setAvatarMenuOpen((prev) => !prev);
                    setCreditPopoverOpen(false);
                  }}
                  aria-label="Open account menu"
                  className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1C1C22] border border-white/10 text-xs font-medium text-zinc-200 whitespace-nowrap shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {avatarMenuOpen && (
                  <div
                    className="fixed right-3 left-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56 rounded-xl bg-[#141418] border border-white/15 shadow-2xl py-2 z-50 text-xs"
                    onMouseLeave={() => setAvatarMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-white/10">
                      <div className="font-bold text-white truncate">{user.name}</div>
                      <div className="text-[11px] font-mono-tabular text-zinc-400 truncate">
                        {user.email}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        navigate('assets');
                      }}
                      className="w-full px-4 py-2 text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Folder className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Assets & Projects</span>
                    </button>

                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        navigate('account');
                      }}
                      className="w-full px-4 py-2 text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Account & Billing Ledger</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          navigate('admin');
                        }}
                        className="w-full px-4 py-2 text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#46ecd5]" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-white/10" />

                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-rose-400 hover:bg-white/5 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => navigate('auth')}
              className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 transition-all whitespace-nowrap shrink-0"
            >
              Login / Sign Up
            </button>
          )}

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile navigation"
            className="lg:hidden p-2 rounded-lg bg-[#141418] border border-white/10 text-zinc-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#111114] border-b border-white/10 px-4 py-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.route}
                onClick={() => {
                  navigate(item.route);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase text-left ${
                  route === item.route
                    ? 'bg-[#46ecd5] text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                navigate('assets');
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase text-left ${
                route === 'assets'
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'bg-zinc-900 text-zinc-300'
              }`}
            >
              Assets Library
            </button>
            <button
              onClick={() => {
                navigate('account');
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase text-left ${
                route === 'account'
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'bg-zinc-900 text-zinc-300'
              }`}
            >
              Account & Wallet
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  navigate('admin');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase text-left flex items-center gap-1.5 ${
                  route === 'admin'
                    ? 'bg-[#46ecd5] text-zinc-950'
                    : 'bg-[#46ecd5]/15 text-[#46ecd5] border border-[#46ecd5]/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setUpgradeModalOpen(true);
              }}
              className="w-full py-2.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider"
            >
              Upgrade Plan / Add Credits
            </button>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MAIN ROUTE VIEWPORT                                                 */}
      {/* =================================================================== */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {route === 'explore' && <ExplorePage />}
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
      {/* QUIET FOOTER WITH SPACIX LOGO                                       */}
      {/* =================================================================== */}
      <footer className="border-t border-white/10 bg-[#09090B] py-8 px-4 sm:px-6 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('explore')}
              aria-label="SPACIX Home"
              className="hover:opacity-90 transition-opacity"
            >
              <SpacixLogo size="sm" />
            </button>
            <span>·</span>
            <span>Multi-Model AI Image, Video & Audio Production Studio</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              onClick={() => navigate('legal', { section: 'terms' })}
              className="hover:text-zinc-300 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => navigate('legal', { section: 'privacy' })}
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate('legal', { section: 'acceptable-use' })}
              className="hover:text-zinc-300 transition-colors"
            >
              Acceptable Use
            </button>
          </div>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* EU COOKIE CONSENT BANNER                                            */}
      {/* =================================================================== */}
      {!cookieConsent && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-40 p-4 rounded-xl bg-[#141418] border border-white/15 shadow-2xl space-y-3">
          <div className="text-xs font-semibold text-white">
            Cookie & Storage Preferences
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            SPACIX uses essential session cookies for passwordless authentication and R2 asset delivery. Optional analytics run only with your explicit consent.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleCookieChoice('essential')}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 rounded-lg"
            >
              Reject Non-Essential
            </button>
            <button
              onClick={() => handleCookieChoice('accepted')}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg"
            >
              Accept All
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#18181C] border border-[#46ecd5]/50 text-xs font-medium text-white shadow-2xl flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#46ecd5] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Modals */}
      <GenerationDetailModal />
      <AuthMagicLinkModal />
      <UpgradeCreditsModal />
    </div>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
