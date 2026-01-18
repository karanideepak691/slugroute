'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import clsx from 'clsx';
import RouteCard from '@/components/RouteCard';
import LoginOverlay from '../components/LoginOverlay';
import ChatWidget from '@/components/ChatWidget';
import { Route, Buddy, Activity, WindData, Trail } from '@/types';
import { useUser } from '@auth0/nextjs-auth0';
import {
  Sun, Cloud, CloudRain, Wind, Thermometer, Droplets,
  MapPin, PersonStanding, Bike, MessageSquare,
  Navigation, Users, CloudSun, Eye, Zap, Search,
  ChevronRight, Play, Info, LogOut, LogIn, X, Clock,
  Volume2, VolumeX, Mic, Check
} from 'lucide-react';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

// Mock Buddies
const MOCK_BUDDIES: Buddy[] = [
  { id: '1', name: 'Alice', locationName: 'McHenry Library', coords: [36.9955, -122.0590], status: 'Studying' },
  { id: '2', name: 'Bob', locationName: 'Kresge College', coords: [36.9970, -122.0660], status: 'Available' },
  { id: '3', name: 'Charlie', locationName: 'Porter College', coords: [36.9940, -122.0650], status: 'Eating' },
];

const CURRENT_LOCATION: [number, number] = [36.9960, -122.0600]; // Science Hill / McHenry (Mock)

export type AppMode = 'BROWSE' | 'ROUTE_PLANNING' | 'NAVIGATING';

export default function Dashboard() {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const [user, setUser] = useState<{ name: string; mode: 'hiker' | 'biker' } | null>(null);
  const [profile, setProfile] = useState<'hiker' | 'biker'>('biker');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [windData, setWindData] = useState<WindData>({ speed: 0, direction: 0, temp: 15, condition: 'Sunny' });
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // TABS: 'community' (used for logic referencing the tab, even if tab bar is gone)
  const [activeTab, setActiveTab] = useState<'community'>('community');
  // Removed isNavigating redundant state, using appMode now.

  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const [voiceTone, setVoiceTone] = useState<'Friendly' | 'Serious' | 'Energetic'>('Friendly');
  const [showTonePicker, setShowTonePicker] = useState(false);

  // New Navigation Flow State
  // AppMode defined above
  const [appMode, setAppMode] = useState<AppMode>('BROWSE');
  const [planningStep, setPlanningStep] = useState<'points_set' | 'route_selection'>('points_set');

  // Search State
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStartLocationFixed, setIsStartLocationFixed] = useState(true); // Default to using "Current Location"

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Custom Routing State
  const [customMarkers, setCustomMarkers] = useState<{ start: [number, number] | null; end: [number, number] | null }>({ start: null, end: null });

  // Community Flow State
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Load Data on Mount
  useEffect(() => {
    // 1. Fetch Wind Data
    fetch('/api/wind').then(res => res.json()).then(data => {
      setWindData({
        speed: data.speed,
        direction: data.direction,
        temp: data.temp || 15, // Default to 15C if missing
        condition: data.condition || 'Sunny'
      });
    });

    // 3. Fetch Trails
    fetch('/api/trails').then(res => res.json()).then(data => {
      setTrails(data.trails || []);
    });
  }, []);

  // Sync Auth0 user to app state
  useEffect(() => {
    if (auth0User && !user) {
      setUser({ name: auth0User.name || auth0User.nickname || 'User', mode: 'biker' });
    }
  }, [auth0User, user]);

  // Helper for F conversion
  const toF = (c: number) => Math.round((c * 9 / 5) + 32);

  const handleLogin = (name: string, mode: 'hiker' | 'biker') => {
    setUser({ name, mode });
    setProfile(mode);
  };

  // -----------------------------------------------------
  // ROUTING LOGIC (CORE, PICKUP, ACTIVITY)
  // -----------------------------------------------------

  // 2. Map Click Handler (Point-to-Point)
  const handleMapClick = (lat: number, lng: number) => {
    // Only allow setting points if we are active in a "map" mode (roughly implied by not being in a specific modal flow, though tabs are now just overlays)
    // Actually, per requirements: "User taps the map to set Point A... and Point B". 
    // We should probably allow this anytime we aren't already navigating or selecting a route.

    // Only allow setting points if we are active in a "map" mode.
    // If NAVIGATING, ignore map clicks (or maybe show route details, but per strict rules: routing triggered by map interaction implies planning).
    // If ROUTE_PLANNING (selection phase), maybe allow changing points? 
    // Requirement: "Routing is triggered only by map interaction... User selects two points... After both... show Continue"

    if (appMode === 'NAVIGATING') return;

    // If in Route Selection phase, clicking map should probably reset to points setting?
    if (appMode === 'ROUTE_PLANNING' && planningStep === 'route_selection') {
      // Optional: Allow clicking to reset/change points? 
      // For strictness, let's say clicks during selection are ignored or reset to points phase.
      // Let's allow resetting.
    }

    // Play sound
    const audio = new Audio('/sounds/click.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => { });

    if (!customMarkers.start) {
      // Case: No Start point yet.
      // Check if End is already set (e.g. via suggestions)
      if (customMarkers.end) {
        setCustomMarkers(prev => ({ ...prev, start: [lat, lng] }));
        handleAudio("Starting point set. Ready to route.");

        // Both points set -> ENTER ROUTE PLANNING MODE
        setAppMode('ROUTE_PLANNING');
        setPlanningStep('points_set');
      } else {
        // Standard Case: Setting Destination (Start = Current Location)
        setCustomMarkers({ start: CURRENT_LOCATION, end: [lat, lng] });
        handleAudio("Destination set. Starting from current location.");

        // Transition immediately to Route Planning
        setAppMode('ROUTE_PLANNING');
        setPlanningStep('points_set');
        setIsStartLocationFixed(true);
      }
    } else if (!customMarkers.end) {
      // Set End
      setCustomMarkers(prev => ({ ...prev, end: [lat, lng] }));
      handleAudio("Destination set.");

      // Both points set -> ENTER ROUTE PLANNING MODE
      setAppMode('ROUTE_PLANNING');
      setPlanningStep('points_set');
    } else {
      // Both exist? Reset and start over
      setCustomMarkers({ start: [lat, lng], end: null });
      handleAudio("Starting new route. Select destination.");

      // Reset to BROWSE
      setAppMode('BROWSE');
      setRoutes([]);
      setExplanation(null);
    }
  };

  // Helper to create visually distinct paths (mocking)
  const offsetPath = (coords: number[][], factor: number) => {
    return coords.map((pt, i) => {
      if (i === 0 || i === coords.length - 1) return pt; // Keep start/end fixed
      // Create a sine arc offset
      const progress = i / coords.length;
      const arc = Math.sin(progress * Math.PI);
      return [
        pt[0] + (arc * factor * 0.002),
        pt[1] - (arc * factor * 0.002) // Invert offset for separation
      ];
    });
  };

  const generateRoutes = async (start: [number, number], end: [number, number]) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        // Primary Route (Fast)
        const fastRoute = data.routes[0];
        const fastCoords = fastRoute.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        const baseDistance = parseFloat((fastRoute.distance * 0.000621371).toFixed(1));
        const baseTime = Math.round(fastRoute.duration / 60);

        // Attempts to use real alternatives if available, otherwise mock offset
        const scenicCoords = data.routes[1]
          ? data.routes[1].geometry.coordinates.map((c: number[]) => [c[1], c[0]])
          : offsetPath(fastCoords, 1.5); // "Winding" offset

        const easyCoords = data.routes[2]
          ? data.routes[2].geometry.coordinates.map((c: number[]) => [c[1], c[0]])
          : offsetPath(fastCoords, -1.0); // "Flatter" offset (opposite side)

        const customRoutes = [
          {
            id: 'custom-fast',
            name: 'Fastest Path',
            type: 'custom',
            distance: baseDistance,
            time: baseTime,
            effort: 8.5, windExposure: 'High', scenic_score: 3, color: '#3b82f6', path: fastCoords
          },
          {
            id: 'custom-scenic',
            name: 'Scenic Route',
            type: 'custom',
            distance: parseFloat((baseDistance * 1.1).toFixed(1)), // Mock longer distance
            time: Math.round(baseTime * 1.2),
            effort: 4.0, windExposure: 'Low', scenic_score: 9, color: '#a855f7', path: scenicCoords
          },
          {
            id: 'custom-easiest',
            name: 'Easiest Route',
            type: 'custom',
            distance: parseFloat((baseDistance * 1.05).toFixed(1)),
            time: Math.round(baseTime * 1.1),
            effort: 2.0, windExposure: 'Low', scenic_score: 6, color: '#22c55e', path: easyCoords
          }
        ];

        setRoutes(customRoutes);
        setSelectedRouteId('custom-scenic');
        handleAudio(`Generated 3 options. Scenic route is ${Math.round(baseTime * 1.2)} minutes.`);
      }
    } catch (e) {
      console.error("Routing failed", e);
    }
  };

  // Social / Community Routing: Start -> (Friend?) -> Activity/End
  const handleCommunityRoute = async (activity: Activity, buddy?: Buddy) => {
    if (!customMarkers.start) {
      alert("Please click the map to set a Start Point first!");
      return;
    }

    const start = customMarkers.start;
    const end = activity.coords as [number, number];

    // Update Markers
    setCustomMarkers(prev => ({ ...prev, end }));

    // If Buddy included: Start -> Buddy -> Activity
    // If Solo: Start -> Activity

    let apiUrl = "";
    if (buddy) {
      const bLoc = buddy.coords;
      apiUrl = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${bLoc[1]},${bLoc[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    } else {
      apiUrl = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    }

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);

        const totalDist = parseFloat((route.distance * 0.000621371).toFixed(1));
        const totalTime = Math.round(route.duration / 60);

        const routeName = buddy ? `With ${buddy.name} to ${activity.title}` : `To ${activity.title}`;
        const routeColor = buddy ? '#ec4899' : '#ef4444'; // Pink for social, Red for activity

        const communityRoute = {
          id: 'community-route',
          name: routeName,
          type: 'custom',
          distance: totalDist,
          time: totalTime,
          effort: 6.0,
          windExposure: 'Medium',
          scenic_score: 8,
          color: routeColor,
          path: coords
        };

        setRoutes([communityRoute]);
        setSelectedRouteId('community-route');

        // Auto-advance to Selection
        setAppMode('ROUTE_PLANNING');
        setPlanningStep('route_selection');

        setShowFriendsModal(false); // Hide modals if open
        setShowWeatherModal(false);

        handleAudio(`Routing ${routeName}. Time: ${totalTime} minutes.`);

        // Reset selection
        setSelectedActivity(null);
      }
    } catch (e) {
      console.error("Community routing failed", e);
    }
  };



  // Update logic when profile changes
  const activeRoutes = useMemo(() => {
    if (profile === 'biker') return routes;
    return routes.map(r => ({
      ...r,
      time: Math.round(r.time * 2.5),
      effort: Math.min(10, r.effort + 2)
    }));
  }, [routes, profile]);

  const handleExplain = async (route: Route) => {
    // setLoadingExplain(true); // Removed unused state
    setExplanation(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          routeName: route.name,
          advantages: route.windExposure ?? 'Unknown',
          windSpeed: windData.speed
        })
      });
      const json = await res.json();
      setExplanation(json.explanation);
    } finally {
      // setLoadingExplain(false);
    }
  };

  // MOCK DATA for Recent Places
  const RECENT_PLACES = [
    { id: 'mchenry', name: "McHenry Library", icon: "📚", coords: [36.9955, -122.0590], time: "2 min ago" },
    { id: 'eastfield', name: "East Field", icon: "⚽", coords: [36.9920, -122.0550], time: "Yesterday" }
  ];

  // AUDIO & HELPER FUNCTIONS
  const handleAudio = async (text?: string) => {
    if (loadingAudio || isMuted) return;
    setLoadingAudio(true);
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        body: JSON.stringify({
          text: text || "Wind warning.",
          tone: voiceTone // Passing tone, assuming API can handle it or ignores it
        })
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('audio/mpeg')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (e) { console.error(e); } finally { setLoadingAudio(false); }
  };

  const generateExplanation = async (route: Route, detailed = false) => {
    setExplanation(`Evaluating ${route.name}...`);
    // Mock or valid API call
    setTimeout(() => {
      setExplanation(route.id === 'fastest' ? "Fastest path with minimal elevation gain." :
        route.id === 'scenic' ? "Beautiful views through the redwoods, slightly longer." :
          "Easiest terrain, avoiding steep hills.");
    }, 500);

    // If genuine AI integration is needed, uncomment:
    /*
    try {
      const res = await fetch('/api/analyze-route', { ... });
      const data = await res.json();
      setExplanation(data.text);
    } catch (e) { ... }
    */
  };

  // WEATHER CATEGORIES (Strict)
  const getActivities = () => {
    const { condition, temp } = windData;
    const activities: (Activity & { iconNode: React.ReactNode })[] = [];

    // Sunny/Clear
    if (condition === 'Sunny' || condition === 'Clear') {
      activities.push({ title: "Pogonip Trail", icon: "🌲", iconNode: <PersonStanding className="w-6 h-6 text-green-600" />, coords: [37.0050, -122.0450], desc: "Perfect visibility for hiking." });
      activities.push({ title: "Seabright Beach", icon: "🏖️", iconNode: <Sun className="w-6 h-6 text-orange-400" />, coords: [36.9600, -122.0200], desc: "Great beach weather." });
      activities.push({ title: "East Field", icon: "🥎", iconNode: <Zap className="w-6 h-6 text-yellow-400" />, coords: [37.0000, -122.0530], desc: "Open fields for sports." });
    }
    // Rainy
    else if (condition === 'Rainy' || condition === 'Drizzle') {
      activities.push({ title: "McHenry Library", icon: "📚", iconNode: <Info className="w-6 h-6 text-purple-400" />, coords: [36.9955, -122.0590], desc: "Cozy reading spot." });
      activities.push({ title: "Downtown Museum", icon: "🏛️", iconNode: <Info className="w-6 h-6 text-blue-400" />, coords: [36.9720, -122.0260], desc: "Stay dry indoors." });
      activities.push({ title: "Capitola Mall", icon: "🛍️", iconNode: <Users className="w-6 h-6 text-rose-400" />, coords: [36.9740, -121.9650], desc: "Indoor shopping." });
    }
    // Windy/Cold
    else if (windData.speed > 15 || temp < 10) {
      activities.push({ title: "Porter Dining", icon: "🍕", iconNode: <Zap className="w-6 h-6 text-orange-400" />, coords: [36.9940, -122.0650], desc: "Sheltered warm food." });
      activities.push({ title: "Science Library", icon: "🔬", iconNode: <Zap className="w-6 h-6 text-blue-400" />, coords: [36.9990, -122.0620], desc: "Underground protection." });
      activities.push({ title: "Arcade", icon: "🕹️", iconNode: <Play className="w-6 h-6 text-purple-500" />, coords: [36.9650, -122.0240], desc: "Indoor fun." });
    }
    // Hot
    else if (temp > 25) {
      activities.push({ title: "Upper Campus", icon: "🌲", iconNode: <Wind className="w-6 h-6 text-green-700" />, coords: [37.0100, -122.0600], desc: "Shaded redwood trails." });
      activities.push({ title: "Pool", icon: "🏊", iconNode: <Droplets className="w-6 h-6 text-blue-400" />, coords: [36.9960, -122.0520], desc: "Cool off in the water." });
    }
    // Default Fallback
    else {
      activities.push({ title: "Walk the Loop", icon: "🚶", iconNode: <PersonStanding className="w-6 h-6 text-gray-400" />, coords: [36.9980, -122.0550], desc: "Standard campus loop." });
    }
    return activities;
  };

  // ANIMATION VARIANTS
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const tabVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-background text-foreground overflow-hidden">
      <ChatWidget
        onNavigate={(tab) => setActiveTab(tab as 'community')}
        context={{
          temp: toF(windData.temp),
          condition: windData.condition,
          activeTab: activeTab
        }}
      />
      {!user && !authLoading && <LoginOverlay onLogin={handleLogin} />}

      {/* LEFT: MAP */}
      <div className="h-[50vh] lg:h-full relative bg-[#E5DACE] w-full">
        <div className="absolute top-4 left-4 z-[400] flex items-center gap-2">
          {/* Menu/Profile Button (SlugRoute) */}
          <div className="relative">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#B2C9AB] hover:bg-[#A3BC99] text-[#4A4036] px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg border border-[#4A4036]/5 transition-colors"
            >
              <img src="/logo.png" className="h-6 w-6 object-contain rounded-full shadow-sm" alt="SlugRoute Logo" />
              <span className="text-[#4A4036]">SlugRoute</span>
              <ChevronRight className={clsx("w-4 h-4 text-[#4A4036]/60 transition-transform", isMenuOpen ? "rotate-90" : "rotate-0")} />
            </motion.button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-[#B2C9AB] rounded-xl border border-[#4A4036]/5 shadow-xl overflow-hidden backdrop-blur-sm origin-top-left"
                >
                  <div className="p-4 border-b border-[#4A4036]/10">
                    <div className="font-bold text-[#4A4036] text-base">{user?.name || 'Guest User'}</div>
                    <div className="text-xs text-[#4A4036]/70">{auth0User?.email || 'Not logged in'}</div>
                  </div>

                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#4A4036]/50 tracking-wider">Mode</div>
                    <button
                      onClick={() => { setProfile('hiker'); setIsMenuOpen(false); }}
                      className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", profile === 'hiker' ? "bg-[#4A4036]/10 text-[#4A4036] font-bold" : "text-[#4A4036]/70 hover:bg-[#4A4036]/5")}
                    >
                      <PersonStanding className="w-4 h-4" /> Hiker
                    </button>
                    <button
                      onClick={() => { setProfile('biker'); setIsMenuOpen(false); }}
                      className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", profile === 'biker' ? "bg-[#4A4036]/10 text-[#4A4036] font-bold" : "text-[#4A4036]/70 hover:bg-[#4A4036]/5")}
                    >
                      <Bike className="w-4 h-4" /> Biker
                    </button>
                  </div>

                  <div className="p-2 border-t border-[#4A4036]/10">
                    {user ? (
                      <a href="/auth/logout" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full">
                        <LogOut className="w-4 h-4" /> Logout
                      </a>
                    ) : (
                      <a href="/auth/login" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-green-400 hover:bg-green-500/10 transition-colors w-full">
                        <LogIn className="w-4 h-4" /> Login
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Social Button */}
          <motion.button
            onClick={() => setShowFriendsModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#B2C9AB] p-2 rounded-full shadow-lg border border-[#4A4036]/5 text-[#4A4036] hover:bg-[#A3BC99] transition-colors"
          >
            <Users className="w-6 h-6" />
          </motion.button>
        </div>



        {/* Modal Overlay for Friends/Social */}
        <AnimatePresence>
          {showFriendsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowFriendsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE0D5] w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl shadow-2xl border border-[#8B6E48]/20 p-6 relative"
              >
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-[#4A4036]/60 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-[#B2C9AB] p-2 rounded-lg text-[#4A4036]">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-[#4A4036]">Friends Nearby</h3>
                </div>

                <div className="space-y-3">
                  {MOCK_BUDDIES.map(buddy => {
                    const dist = Math.abs(buddy.coords[0] - 36.9960) * 69 + Math.abs(buddy.coords[1] - (-122.0600)) * 54;
                    return (
                      <motion.div
                        key={buddy.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleMapClick(buddy.coords[0], buddy.coords[1]);
                          handleAudio(`Locating ${buddy.name} at ${buddy.locationName}.`);
                          setShowFriendsModal(false);
                        }}
                        className="group cursor-pointer p-3 rounded-2xl bg-[#B2C9AB] border border-[#4A4036]/5 flex items-center gap-4 transition-all hover:bg-[#A3BC99]"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-[#EAE0D5] flex items-center justify-center text-[#4A4036] font-bold text-lg shadow-sm border border-[#4A4036]/10">
                            {buddy.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-[#4A4036] backdrop-blur-md rounded-full p-1 border border-[#EAE0D5]">
                            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse box-content border-2 border-transparent" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-bold text-[#4A4036] text-base truncate">{buddy.name}</h4>
                            <span className="text-xs text-[#4A4036]/60 font-mono tracking-tighter">{dist.toFixed(1)} mi</span>
                          </div>
                          <div className="text-sm text-[#4A4036]/60 truncate flex items-center gap-1.5">
                            {buddy.status === 'Studying' && <span className="text-xs">📚</span>}
                            {buddy.status === 'Eating' && <span className="text-xs">🍔</span>}
                            {buddy.locationName}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#4A4036]/50" />
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Overlay for Weather */}
        <AnimatePresence>
          {showWeatherModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowWeatherModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE0D5] w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl shadow-2xl border border-[#8B6E48]/20 p-6 relative"
              >
                <button
                  onClick={() => setShowWeatherModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-[#4A4036]/60 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </button>

                {/* Weather Content Reused from Tab */}
                <div className="text-center pt-2 pb-6">
                  <h3 className="text-lg font-medium text-[#4A4036]/70">Santa Cruz</h3>
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-7xl font-thin tracking-tighter text-[#4A4036]">{toF(windData.temp)}°</span>
                    <span className="text-xl font-medium text-[#4A4036] capitalize mt-1">{windData.condition}</span>
                    <div className="flex gap-2 mt-2 text-sm font-medium text-[#4A4036]/60">
                      <span>H:{toF(windData.temp + 2)}°</span>
                      <span>L:{toF(windData.temp - 3)}°</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#B2C9AB] p-4 rounded-2xl border border-[#4A4036]/5 flex flex-col justify-between min-h-[120px] shadow-sm">
                    <div className="flex items-center gap-2 text-[#4A4036]/60 text-[10px] uppercase font-bold tracking-wider">
                      <Wind className="w-3 h-3" /> Wind
                    </div>
                    <div>
                      <span className="text-2xl font-medium text-[#4A4036]">{windData.speed}</span>
                      <span className="text-xs text-[#4A4036]/60 ml-1">m/s</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#4A4036]/70">
                      Direction: {windData.direction}°
                    </div>
                  </div>
                  <div className="bg-[#B2C9AB] p-4 rounded-2xl border border-[#4A4036]/5 flex flex-col justify-between min-h-[120px] shadow-sm">
                    <div className="flex items-center gap-2 text-[#4A4036]/60 text-[10px] uppercase font-bold tracking-wider">
                      <Thermometer className="w-3 h-3" /> Feels Like
                    </div>
                    <div>
                      <span className="text-2xl font-medium text-[#4A4036]">{toF(windData.temp - 1)}°</span>
                    </div>
                    <p className="text-[10px] text-[#4A4036]/70 leading-tight">Humidity moderate.</p>
                  </div>
                </div>

                <div className="bg-[#B2C9AB] rounded-2xl border border-[#4A4036]/5 p-4 shadow-sm">
                  <div className="text-[#4A4036]/60 text-[10px] uppercase font-bold tracking-wider mb-4">5-Day Forecast</div>
                  <div className="space-y-3">
                    {(windData.forecast || [
                      { day: 'Mon', condition: 'Sunny', temp: 18, icon: '☀️' },
                      { day: 'Tue', condition: 'Cloudy', temp: 16, icon: '☁️' },
                      { day: 'Wed', condition: 'Rainy', temp: 14, icon: '🌧️' },
                      { day: 'Thu', condition: 'Sunny', temp: 19, icon: '☀️' },
                      { day: 'Fri', condition: 'Cloudy', temp: 17, icon: '☁️' },
                    ]).map((day, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="w-8 font-bold text-[#4A4036]">{day.day}</span>
                        <span className="text-lg">{day.icon}</span>
                        <span className="text-[#4A4036] font-mono text-xs">{toF(day.temp)}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weather Widget Button */}
        <motion.button
          onClick={() => setShowWeatherModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-[#B2C9AB] px-6 py-2 rounded-full flex items-center gap-4 text-xs font-mono shadow-xl border border-[#4A4036]/5 cursor-pointer hover:bg-[#A3BC99] transition-colors"
        >
          <div className="flex flex-col items-center">
            <span className="text-[#4A4036] font-bold text-sm">{windData.condition}</span>
            <span className="text-[#4A4036]/70 text-[10px]">{toF(windData.temp)}°F</span>
          </div>
          <div className="h-4 w-px bg-[#4A4036]/10" />
          <div className="flex items-center gap-2">
            <span className="text-[#4A4036] opacity-60 font-bold">WIND</span><span className="text-[#4A4036] text-lg">{windData.speed}</span><span className="text-[#4A4036]/60">m/s</span>
          </div>
        </motion.button>

        {/* Instructions */}
        <AnimatePresence>

          {/* SEARCH WIDGET (Only in BROWSE mode) */}
          {appMode === 'BROWSE' && (
            <div className="absolute top-4 right-4 z-[500] w-[340px]">
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-[#4A4036]/50" />
                </div>
                <input
                  type="text"
                  placeholder="Where do you want to go?"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#EAE0D5]/90 backdrop-blur-md border border-[#4A4036]/10 rounded-2xl shadow-lg text-[#4A4036] placeholder:text-[#4A4036]/50 focus:outline-none focus:ring-2 focus:ring-[#4A4036]/20 transition-all font-medium"
                />
                {/* Close Button if focused */}
                {isSearchFocused && (
                  <button
                    onClick={() => {
                      setIsSearchFocused(false);
                      setSearchQuery("");
                    }}
                    className="absolute inset-y-0 right-3 flex items-center text-[#4A4036]/50 hover:text-[#4A4036]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="mt-2 bg-[#EAE0D5]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-[#4A4036]/10 overflow-hidden max-h-[60vh] overflow-y-auto"
                  >
                    {/* Recent Searches */}
                    <div className="p-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#4A4036]/40 px-3 py-2">Recent</h3>
                      {RECENT_PLACES.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => {
                            setSearchQuery(place.name);
                            setCustomMarkers({ start: null, end: place.coords as [number, number] });
                            handleAudio(`Destination set to ${place.name}. Select start point.`);

                            // Optional: Close dropdown but keep search bar filled?
                            // Requirement: "Clicking a recent item should autofill... and set it as destination"
                            setIsSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-[#B2C9AB]/20 rounded-xl transition-colors text-left group"
                        >
                          <div className="bg-[#B2C9AB]/30 p-2 rounded-lg text-[#4A4036] group-hover:bg-[#B2C9AB] transition-colors">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#4A4036] text-sm">{place.name}</div>
                            <div className="text-[10px] text-[#4A4036]/60">{place.time}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Weather Suggestions */}
                    <div className="p-2 border-t border-[#4A4036]/10">
                      <div className="flex items-center justify-between px-3 py-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#4A4036]/40">Suggested for {windData.condition}</h3>
                        <div className="bg-[#B2C9AB] text-[10px] font-bold px-2 py-0.5 rounded-full text-[#4A4036]">{toF(windData.temp)}°F</div>
                      </div>

                      {getActivities().map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearchQuery(act.title);
                            setCustomMarkers({ start: CURRENT_LOCATION, end: act.coords as [number, number] });
                            setAppMode('ROUTE_PLANNING');
                            setPlanningStep('points_set');
                            setIsStartLocationFixed(true);
                            handleAudio(`Destination set to ${act.title} from current location.`);
                            setIsSearchFocused(false);
                          }}
                          className="w-full flex items-start gap-3 p-3 hover:bg-[#B2C9AB]/20 rounded-xl transition-colors text-left group"
                        >
                          <div className="text-xl bg-[#FFFFFF]/40 p-2 rounded-lg group-hover:bg-[#FFFFFF]/80 transition-colors">
                            {act.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-[#4A4036] text-sm truncate">{act.title}</div>
                              <span className="text-[10px] text-[#4A4036]/60">1.2 mi</span>
                            </div>
                            <div className="text-xs text-[#4A4036]/70 line-clamp-1">{act.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* "Continue" -> Route Selection TRIGGER (REPLACED WITH PLANNING SHEET) */}
          {appMode === 'ROUTE_PLANNING' && planningStep === 'points_set' && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 w-full bg-[#EAE0D5] rounded-t-3xl shadow-[0_-10px_40px_rgba(74,64,54,0.2)] z-[600] p-6 pb-12 border-t border-[#4A4036]/10"
            >
              <div className="w-12 h-1.5 bg-[#4A4036]/20 rounded-full mx-auto mb-6" />

              <div className="space-y-4 mb-6">
                {/* FROM INPUT */}
                <div className="flex items-center gap-3 bg-[#B2C9AB]/20 p-3 rounded-xl border border-[#4A4036]/5">
                  <div className="bg-[#B2C9AB] p-2 rounded-full text-[#4A4036]">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div
                    onClick={() => {
                      if (isStartLocationFixed) {
                        // Clear Start to allow manual selection
                        setCustomMarkers(prev => ({ ...prev, start: null }));
                        setIsStartLocationFixed(false);
                        handleAudio("Select a starting point on the map.");
                      }
                    }}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="text-[10px] uppercase font-bold text-[#4A4036]/50 tracking-wider">From</div>
                    <div className={clsx("font-bold text-[#4A4036]", !customMarkers.start ? "text-[#4A4036]/40 italic" : "")}>
                      {isStartLocationFixed ? "Current Location" : (customMarkers.start ? "Custom Pin" : "Select Start Point...")}
                    </div>
                  </div>
                  {isStartLocationFixed && (
                    <button onClick={() => { setCustomMarkers(prev => ({ ...prev, start: null })); setIsStartLocationFixed(false); }} className="p-2 text-[#4A4036]/40 hover:text-[#4A4036]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* TO INPUT */}
                <div className="flex items-center gap-3 bg-[#FFFFFF]/40 p-3 rounded-xl border border-[#4A4036]/5">
                  <div className="bg-[#4A4036] p-2 rounded-full text-[#EAE0D5]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase font-bold text-[#4A4036]/50 tracking-wider">To</div>
                    <div className="font-bold text-[#4A4036]">{searchQuery || "Marked Location"}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCustomMarkers({ start: null, end: null });
                    setAppMode('BROWSE');
                    setSearchQuery("");
                    handleAudio("Route cleared.");
                  }}
                  className="px-6 py-4 rounded-xl font-bold text-[#4A4036] bg-[#B2C9AB]/20 hover:bg-[#B2C9AB]/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!customMarkers.start || !customMarkers.end}
                  onClick={() => {
                    if (customMarkers.start && customMarkers.end) {
                      setPlanningStep('route_selection');
                      generateRoutes(customMarkers.start, customMarkers.end);
                    }
                  }}
                  className="flex-1 bg-[#4A4036] text-[#EAE0D5] py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Find Routes <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Map
          routes={((appMode === 'ROUTE_PLANNING' && planningStep === 'route_selection') || appMode === 'NAVIGATING') ? activeRoutes : []}
          trails={activeTab === 'community' ? trails : []}
          selectedRouteId={selectedRouteId}
          windDirection={windData.direction}
          windSpeed={windData.speed}
          onMapClick={handleMapClick}
          customMarkers={customMarkers}
          buddies={MOCK_BUDDIES}
          userLocation={CURRENT_LOCATION}
        />

        {/* BOTTOM LEFT AUDIO CONTROLS */}
        <div className="absolute bottom-8 left-8 z-[500] flex flex-col items-start gap-2">
          <AnimatePresence>
            {showTonePicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="bg-[#EAE0D5] rounded-xl border border-[#4A4036]/10 p-2 shadow-xl mb-2 min-w-[140px]"
              >
                <div className="text-[10px] uppercase font-bold text-[#4A4036]/50 px-2 py-1 tracking-wider">Voice Tone</div>
                {['Friendly', 'Serious', 'Energetic'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => {
                      setVoiceTone(tone as 'Friendly' | 'Serious' | 'Energetic');
                      setShowTonePicker(false);
                      // Preview tone?
                    }}
                    className={clsx(
                      "w-full text-left px-2 py-2 rounded-lg text-sm flex items-center justify-between transition-colors",
                      voiceTone === tone ? "bg-[#B2C9AB] text-[#4A4036] font-bold" : "text-[#4A4036]/70 hover:bg-[#4A4036]/5"
                    )}
                  >
                    {tone}
                    {voiceTone === tone && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMuted(!isMuted)}
              className={clsx(
                "p-3 rounded-full shadow-lg border transition-colors",
                isMuted
                  ? "bg-[#4A4036] text-[#EAE0D5] border-[#EAE0D5]/20"
                  : "bg-[#B2C9AB] text-[#4A4036] border-[#4A4036]/5"
              )}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTonePicker(!showTonePicker)}
              className="bg-[#EAE0D5] text-[#4A4036] p-3 rounded-full shadow-lg border border-[#4A4036]/10 hover:bg-[#fff]"
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

      </div>

      {/* RIGHT: CONTROLS */}
      {/* RIGHT: CONTROLS (Overlay on both Mobile and Desktop) */}
      <div className={clsx("absolute bottom-0 right-0 z-20 pointer-events-none w-full lg:w-1/3 h-auto lg:h-full flex flex-col justify-end lg:justify-start", appMode === 'BROWSE' ? "hidden" : "")}>



        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative">
          <AnimatePresence mode="wait">

            {/* NEW FLOW ELEMENTS (Rendered in Right Panel or Overlay) */}

            {/* BOTTOM SHEET: ROUTE SELECTION (only in route_selection step) */}
            <AnimatePresence>
              {appMode === 'ROUTE_PLANNING' && planningStep === 'route_selection' && (
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  className="absolute bottom-0 left-0 right-0 z-[600] bg-[#EAE0D5] rounded-t-3xl shadow-2xl p-6 border-t border-[#4A4036]/10 max-h-[50vh] overflow-y-auto pointer-events-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-xl text-[#4A4036]">Select Route</h3>
                    <button
                      onClick={() => {
                        setRoutes([]);
                        setPlanningStep('points_set'); // Go back
                      }}
                      className="p-2 rounded-full hover:bg-[#4A4036]/5 text-[#4A4036]/60"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {activeRoutes.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 border-4 border-[#4A4036]/20 border-t-[#4A4036] rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-[#4A4036]/60">Calculating best routes...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-8">
                      {activeRoutes.map((route, i) => (
                        <RouteCard
                          key={route.id}
                          {...route}
                          color={route.id === 'fastest' ? '#4ade80' : route.id === 'scenic' ? '#facc15' : '#60a5fa'}
                          selected={selectedRouteId === route.id}
                          onSelect={() => {
                            setSelectedRouteId(route.id);
                            generateExplanation(route, true);
                          }}
                          onExplain={() => generateExplanation(route, true)}
                          onAudio={() => { }}
                          onStart={() => {
                            setAppMode('NAVIGATING');
                            handleAudio(`Starting navigation. ${explanation || "Proceed to start point."}`);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>



            {/* 1b. NAVIGATION MODE (Heads Up Display) */}
            {appMode === 'NAVIGATING' && (
              <motion.div
                key="nav-mode"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col h-full justify-between pb-6 pointer-events-auto"
              >
                {/* Top Banner: Next Turn */}
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-[#B2C9AB] border-l-4 border-[#4A4036] p-6 rounded-2xl shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Navigation className="w-24 h-24 rotate-45 text-[#4A4036]" />
                  </div>
                  <div className="relative z-10 text-left">
                    <h3 className="text-[#4A4036]/60 text-sm font-bold uppercase tracking-wider mb-1">Next Turn</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-[#4A4036] tracking-tighter">0.3</span>
                      <span className="text-xl font-medium text-[#4A4036]/60">mi</span>
                    </div>
                    <div className="flex items-center gap-3 mt-4 text-[#4A4036] font-bold text-lg">
                      <div className="w-10 h-10 rounded-full bg-[#4A4036]/10 flex items-center justify-center">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                      Turn Right on Science Hill Dr.
                    </div>
                  </div >
                </motion.div>

                {/* Bottom Stats & Controls */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#B2C9AB] p-3 rounded-xl shadow-sm">
                      <div className="text-xs text-[#4A4036]/60 font-bold uppercase">Arrival</div>
                      <div className="text-lg font-bold text-[#4A4036]">10:45</div>
                    </div>
                    <div className="bg-[#B2C9AB] p-3 rounded-xl shadow-sm">
                      <div className="text-xs text-[#4A4036]/60 font-bold uppercase">Time</div>
                      <div className="text-lg font-bold text-[#4A4036]">{selectedRouteId ? activeRoutes.find(r => r.id === selectedRouteId)?.time : 15}m</div>
                    </div>
                    <div className="bg-[#B2C9AB] p-3 rounded-xl shadow-sm">
                      <div className="text-xs text-[#4A4036]/60 font-bold uppercase">Dist</div>
                      <div className="text-lg font-bold text-[#4A4036]">{selectedRouteId ? activeRoutes.find(r => r.id === selectedRouteId)?.distance : 1.2}mi</div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setAppMode('BROWSE');
                      setCustomMarkers({ start: null, end: null });
                      setRoutes([]);
                      setExplanation(null);
                      handleAudio("Navigation ended.");
                    }}
                    className="w-full py-4 bg-[#B2C9AB] hover:bg-[#A3BC99] border-2 border-[#4A4036]/10 text-[#4A4036] rounded-xl font-bold transition-all shadow-sm"
                  >
                    End Route
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div >

        {/* Footer / AI Area (Only for Navigation) */}
        <AnimatePresence>
          {
            (appMode === 'NAVIGATING' || (appMode === 'ROUTE_PLANNING' && planningStep === 'route_selection')) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-6 bg-[#B2C9AB] min-h-[160px] border-t border-[#4A4036]/10 pointer-events-auto"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Gemini Analysis
                </h3>
                <AnimatePresence mode='wait'>
                  {explanation ? (
                    <motion.div key="content" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm leading-relaxed text-gray-200">
                      {explanation}
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground italic">
                      Select a route...
                    </motion.div>
                  )}
                </AnimatePresence>

                {appMode === 'NAVIGATING' && (
                  <div className='mt-4 flex justify-end'>
                    <button onClick={() => {
                      setAppMode('BROWSE');
                      setCustomMarkers({ start: null, end: null });
                      setRoutes([]);
                      setExplanation(null);
                      setSearchQuery("");
                    }} className='bg-[#4A4036] text-[#EAE0D5] text-xs font-bold px-4 py-2 rounded-lg'>
                      End Route
                    </button>
                  </div>
                )}
              </motion.div>
            )
          }
        </AnimatePresence>

      </div >
    </div >
  );
}

// Simple animated number component
function MotionNumber({ value }: { value: number }) {
  return (
    <h2 className="text-4xl font-bold text-white relative">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="inline-block"
        >
          {value}°F
        </motion.span>
      </AnimatePresence>
    </h2>
  );
}
