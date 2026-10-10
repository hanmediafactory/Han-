import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  ScreenType,
  MainTabType,
  Task,
  Project,
  Expense,
  TeamMember,
  Funnel,
  Lead,
  NotificationItem,
} from "../types";

import {
  saveCachedState,
  getCachedState,
  enqueueMutation,
  getPendingMutations,
  removePendingMutation,
  markMutationFailed,
  clearAccountCache,
  retireLegacyStorage,
} from "../utils/offlineStore";
import { analytics } from "../utils/analytics";
import { today } from "./dates";
import { getApiUrl } from "../utils/apiConfig";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";

export type Account = {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
  active: boolean;
  permissions: string[];
};

export type RecordData = Record<string, unknown> & { id: string };
export type Finance = {
  income: number;
  expenses: number;
  funds: number;
  savings: number;
  total: number;
  salaries: number;
  currentMonthExpenses?: number;
  individualSpending?: number;
  sharedSpending?: number;
  activeExpensesCount?: number;
  voidExpensesCount?: number;
  missingReceiptsCount?: number;
  categoryBreakdown?: Record<string, number>;
  subcategoryBreakdown?: Record<string, number>;
  founderTotals?: Array<{
    id: string;
    name: string;
    paid: number;
    allocated: number;
    settledPaid: number;
    settledReceived: number;
    netPosition: number;
    outstanding: number;
    receivable: number;
    payable: number;
  }>;
  pairwise?: Array<{
    debtorId: string;
    debtorName: string;
    creditorId: string;
    creditorName: string;
    amount: number;
  }>;
};

export type State = {
  projects: Project[];
  tasks: Task[];
  transactions: Expense[];
  team_members: TeamMember[];
  funnels: Funnel[];
  leads: Lead[];
  notifications: NotificationItem[];
  users: Account[];
  calendar_events: RecordData[];
  categories: RecordData[];
  settings: RecordData[];
  activity_logs: RecordData[];
  permissionIds: string[];
  savings_entries: RecordData[];
  salary_payments: RecordData[];
  settlements: RecordData[];
  finance: Finance | null;
  demo: boolean;
};

const empty: State = {
  projects: [],
  tasks: [],
  transactions: [],
  team_members: [],
  funnels: [],
  leads: [],
  notifications: [],
  users: [],
  calendar_events: [],
  categories: [],
  settings: [],
  activity_logs: [],
  permissionIds: [],
  savings_entries: [],
  salary_payments: [],
  settlements: [],
  finance: null,
  demo: false,
};

function useController() {
  const [user, setUser] = useState<Account | null>(null),
    [loading, setLoading] = useState(true),
    [connectionError, setConnectionError] = useState(""),
    [isOffline, setIsOffline] = useState(!navigator.onLine),
    [syncing, setSyncing] = useState(false),
    [state, setState] = useState<State>(empty),
    [busy, setBusy] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<ScreenType>("home"),
    [activeTab, setActiveTab] = useState<MainTabType>("home"),
    [activeProjectId, setActiveProjectId] = useState<string | null>(null),
    [activeFunnelId, setActiveFunnelId] = useState<string | null>(null),
    [selectedDate, setSelectedDate] = useState(today());

  const [toast, setToast] = useState<{ id: string; message: string } | null>(null);
  const [screenFilter, setScreenFilter] = useState("All");
  const [createOnOpen, setCreateOnOpen] = useState(false);

  const csrf = useRef(""),
    timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const account = useRef<Account | null>(null);
  const mutationLock = useRef(false);
  const syncLock = useRef(false);
  const refreshSequence = useRef(0);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const [notificationAlert, setNotificationAlert] = useState<NotificationItem | null>(null);
  const seenNotifications = useRef<{ userId: string; ids: Set<string> } | null>(null);
  const [queueRevision, setQueueRevision] = useState(0);
  const updateQueue = () => setQueueRevision(value => value + 1);
  void queueRevision;

  const showToast = useCallback((message: string) => {
    clearTimeout(timeout.current);
    setToast({ id: crypto.randomUUID(), message });
    timeout.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const request = useCallback(
    async (path: string, method = "GET", body?: unknown, mutationId?: string, version?: string) => {
      try {
        const response = await fetch(getApiUrl(path), {
          method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf.current,
            ...(mutationId ? { "Idempotency-Key": mutationId } : {}),
            ...(version ? { "If-Unmodified-Since": version } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });

        if (response.status === 401 && path !== "login") {
          if (account.current) clearAccountCache(account.current.id);
          account.current = null;
          localStorage.removeItem("han_offline_session_v2");
          setUser(null);
          setState(empty);
        }

        const data = await response.json();
        if (!response.ok) throw Object.assign(new Error(data.error || "Request failed."), { status: response.status });
        return data;
      } catch (err) {
        if (!navigator.onLine) {
          setIsOffline(true);
        }
        throw err;
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    const userId = account.current?.id;
    if (!userId) return;
    const sequence = ++refreshSequence.current;
    try {
      const newState = await request("state");
      if (account.current?.id !== userId || sequence !== refreshSequence.current) return;
      if (newState.viewerId && newState.viewerId !== userId) {
        clearAccountCache(userId);
        account.current = null;
        csrf.current = "";
        setUser(null);
        setState(empty);
        setNotificationAlert(null);
        seenNotifications.current = null;
        setConnectionError("The account changed in another tab. Sign in again.");
        return;
      }
      const seen = seenNotifications.current;
      if (seen?.userId === userId) {
        const incoming = newState.notifications.find((item: NotificationItem) => !item.read && !seen.ids.has(item.id) && (item.created_by !== userId || item.iconType === "deadline"));
        if (incoming && !mutationLock.current && localStorage.getItem(`han_alerts_${userId}`) !== "off") setNotificationAlert(incoming);
      }
      seenNotifications.current = { userId, ids: new Set(newState.notifications.map((item: NotificationItem) => item.id)) };
      setState(newState);
      setLastSyncedAt(new Date().toISOString());
      saveCachedState(userId, newState);
      setConnectionError("");
      setIsOffline(false);
    } catch {
      if (account.current?.id !== userId || sequence !== refreshSequence.current) return;
      const cached = getCachedState(userId);
      if (cached?.state) {
        setState(cached.state as State);
        setConnectionError("Connection unavailable — showing your last saved workspace.");
      } else {
        setConnectionError("Cannot reach HAN server. Check your connection.");
      }
    }
  }, [request]);

  const processPendingQueue = useCallback(async () => {
    const userId = account.current?.id;
    if (!userId || syncLock.current || !navigator.onLine) return;
    const queue = getPendingMutations(userId);
    if (queue.length === 0) return;
    syncLock.current = true;
    setSyncing(true);
    let successCount = 0;

    for (const item of queue) {
      if (account.current?.id !== userId || item.error) break;
      try {
        await request(item.path, item.method, item.data, item.id, item.version);
        removePendingMutation(userId, item.id);
        successCount++;
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        if (status && status !== 401 && status !== 429 && status < 500) {
          markMutationFailed(userId, item.id, (err as Error).message);
          showToast("A queued change needs review. Open You → Pending changes.");
        }
        break;
      }
    }

    setSyncing(false);
    syncLock.current = false;
    updateQueue();
    if (successCount > 0) {
      showToast(`Synced ${successCount} offline change(s)`);
      analytics.track("offline_sync_triggered", { syncedCount: successCount });
      await refresh();
    }
  }, [request, refresh, showToast]);

  useEffect(() => {
    const handleOnline = async () => {
      try {
        const session = await request("session");
        csrf.current = session.csrf;
        account.current = session.user;
        setUser(session.user);
      } catch { return; }
      setIsOffline(false);
      setConnectionError("");
      void processPendingQueue();
      void refresh();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setConnectionError("Offline mode — Changes will queue and sync when reconnected.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processPendingQueue, request, refresh, showToast]);

  const restore = useCallback(async () => {
    if (!account.current) setLoading(true);
    try {
      const session = await request("session");
      csrf.current = session.csrf;
      account.current = session.user;
      setUser(session.user);
      localStorage.setItem("han_offline_session_v2", JSON.stringify({ user: session.user, expiresAt: session.expiresAt }));
      await refresh();
      void processPendingQueue();
      const target = window.location.hash.slice(1);
      if (["tasks", "projects", "money", "leads", "funnels", "calendar", "notifications"].includes(target)) setCurrentScreen(target as ScreenType);

    } catch (error) {
      if (!(error as Error & { status?: number }).status) {
        try {
          const saved = JSON.parse(localStorage.getItem("han_offline_session_v2") || "null");
          const cached = saved?.expiresAt > Date.now() ? getCachedState(saved.user.id) : null;
          if (cached) { account.current = saved.user; setUser(saved.user); setState(cached.state as State); setIsOffline(true); setConnectionError("Offline — viewing your last saved workspace."); }
        } catch { /* No valid offline identity. */ }
      }
    } finally {
      setLoading(false);
    }
  }, [request, refresh, processPendingQueue]);

  useEffect(() => {
    retireLegacyStorage();
    void Promise.resolve().then(restore);
    return () => clearTimeout(timeout.current);
  }, [restore]);
  useEffect(() => {
    if (!notificationAlert) return;
    const timer = setTimeout(() => setNotificationAlert(null), 8000);
    return () => clearTimeout(timer);
  }, [notificationAlert]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const keep = (handle: { remove: () => Promise<void> }) => { if (cancelled) void handle.remove(); else handles.push(handle); };
    void NativeApp.addListener("appStateChange", event => { if (event.isActive && navigator.onLine) void restore(); }).then(keep);
    void NativeApp.addListener("backButton", () => { if (currentScreen !== "home") { setCurrentScreen("home"); setActiveTab("home"); } else void NativeApp.exitApp(); }).then(keep);
    void PushNotifications.addListener("pushNotificationActionPerformed", event => {
      const target = event.notification.data?.targetScreen;
      if (["tasks", "projects", "money", "leads", "funnels", "calendar", "notifications"].includes(target)) { window.location.hash = target; setCurrentScreen(target as ScreenType); }
    }).then(keep);
    return () => { cancelled = true; handles.forEach(handle => void handle.remove()); };
  }, [currentScreen, restore]);

  useEffect(() => {
    if (!user || isOffline) return;
    const events = new EventSource(getApiUrl("events"));
    let debounce: ReturnType<typeof setTimeout>;
    events.onopen = () => setLiveConnected(true);
    events.onerror = () => setLiveConnected(false);
    events.addEventListener("workspace", () => { clearTimeout(debounce); debounce = setTimeout(() => void refresh(), 100); });
    events.addEventListener("revoked", () => { events.close(); void restore(); });
    const onFocus = () => { if (document.visibilityState === "visible") { void processPendingQueue(); void refresh(); } };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") { void processPendingQueue(); void refresh(); }
    }, 15000);
    return () => { clearInterval(id); clearTimeout(debounce); events.close(); setLiveConnected(false); document.removeEventListener("visibilitychange", onFocus); window.removeEventListener("focus", onFocus); };
  }, [user, isOffline, refresh, restore, processPendingQueue]);

  const login = async (userId: string, password: string) => {
    const session = await request("login", "POST", { userId, password });
    csrf.current = session.csrf;
    account.current = session.user;
    seenNotifications.current = null;
    setNotificationAlert(null);
    setCurrentScreen("home");
    setActiveTab("home");
    localStorage.setItem("han_offline_session_v2", JSON.stringify({ user: session.user, expiresAt: session.expiresAt }));
    await refresh();
    analytics.track("login_success", { userId: session.user.id, role: session.user.role });
    const target = window.location.hash.slice(1);
    if (["tasks", "projects", "money", "leads", "funnels", "calendar", "notifications"].includes(target)) setCurrentScreen(target as ScreenType);
    setUser(session.user);
    void processPendingQueue();
  };

  const logout = async () => {
    if (user && getPendingMutations(user.id).length) { showToast("Sync or discard pending changes in You before signing out."); return; }
    try {
      await request("logout", "POST");
      if (user) clearAccountCache(user.id);
      localStorage.removeItem("han_offline_session_v2");
      account.current = null;
      analytics.track("logout", { userId: user?.id });
      setUser(null);
      setState(empty);
      setNotificationAlert(null);
      seenNotifications.current = null;
      csrf.current = "";
    } catch (error) {
      showToast((error as Error).message);
    }
  };

  const mutate = async (path: string, method: string, data?: unknown) => {
    const userId = account.current?.id;
    if (!userId || mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(true);
    const mutationId = crypto.randomUUID();
    const [table, id] = path.split("/");
    const records = table === "income" || table === "expenses" ? state.transactions : state[table as keyof State];
    const record = Array.isArray(records) ? records.find(item => typeof item === "object" && "id" in item && item.id === id) : null;
    const version = record && typeof record === "object" && "updated_at" in record ? String(record.updated_at) : undefined;
    const queueable = ["projects", "tasks", "income", "expenses", "leads", "funnels", "calendar_events"].includes(table) && method !== "DELETE";
    const queue = () => {
      if (!queueable) throw new Error("This action requires a connection to the server.");
      enqueueMutation(userId, path, method, data, version, mutationId);
      updateQueue();
      showToast("Change queued on this device. It will appear after the server confirms it.");
      return true;
    };

    try {
      if (isOffline || !navigator.onLine) return queue();
      await request(path, method, data, mutationId, version);
      await refresh();
      showToast("Saved");
      return true;
    } catch (error) {
      if (!(error as Error & { status?: number }).status && queueable && (error instanceof TypeError || (error as Error).name === "TimeoutError")) {
        try { return queue(); } catch (storageError) { showToast((storageError as Error).message); return false; }
      }
      showToast((error as Error).message);
      return false;
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const navigateTo = (screen: ScreenType, filter = "All", create = false) => {
    setScreenFilter(filter);
    setCreateOnOpen(create);
    if (screen !== "project-details" && !(screen === "tasks" && currentScreen === "project-details")) setActiveProjectId(null);
    setCurrentScreen(screen);
    if (screen === "home") setActiveTab("home");
    if (["projects", "tasks", "project-details"].includes(screen)) setActiveTab("work");
    if (["money", "add-expense"].includes(screen)) setActiveTab("money");
    if (["funnels", "funnel-details", "leads"].includes(screen)) setActiveTab("growth");
    if (screen === "profile") setActiveTab("you");
  };

  const switchTab = (tab: MainTabType) => {
    setScreenFilter("All");
    setCreateOnOpen(false);
    setActiveProjectId(null);
    setActiveTab(tab);
    setCurrentScreen(
      (
        {
          home: "home",
          money: "money",
          work: "projects",
          growth: "funnels",
          you: "profile",
        } as const
      )[tab],
    );
  };

  const tasks = state.tasks,
    expenses = state.transactions,
    todayTasks = tasks.filter((t) => t.date === today() && t.status !== "CANCELLED");

  const totalTasksTodayCount = todayTasks.length,
    tasksCompletedTodayCount = todayTasks.filter((t) => t.completed).length;

  const totalIncome =
      expenses
        .filter((e) => e.type === "income")
        .reduce((a, e) => a + Math.round(e.amount * 100), 0) / 100,
    totalExpenses =
      expenses
        .filter((e) => e.type === "expense")
        .reduce((a, e) => a + Math.round(e.amount * 100), 0) / 100;

  let dayStreak = 0;
  const cursor = new Date(`${today()}T12:00:00`);
  for (let i = 0; i < 366; i++) {
    const key = new Intl.DateTimeFormat("en-CA").format(cursor);
    if (!tasks.some((t) => t.completed && t.date === key)) {
      if (i === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    dayStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const can = (permission: string) =>
    user?.role === "OWNER" || !!user?.permissions.includes(permission);

  return {
    state,
    user,
    loading,
    connectionError,
    isOffline,
    syncing,
    pendingMutationsCount: user ? getPendingMutations(user.id).length : 0,
    pendingMutations: user ? getPendingMutations(user.id) : [],
    processPendingQueue,
    discardPendingMutation: (id: string) => { if (user) { removePendingMutation(user.id, id); updateQueue(); } },
    busy,
    lastSyncedAt,
    liveConnected,
    notificationAlert,
    dismissNotificationAlert: () => setNotificationAlert(null),
    login,
    logout,
    restore,
    refresh,
    request,
    mutate,
    can,
    currentScreen,
    activeTab,
    activeProjectId,
    activeFunnelId,
    selectedDate,
    setSelectedDate,
    toast,
    showToast,
    navigateTo,
    screenFilter,
    createOnOpen,
    setCreateOnOpen,
    switchTab,
    userProfile: {
      name: user?.name || "",
      role: user?.role || "",
      greeting: "Welcome back,",
      subheading: "Same focus. Bigger goals.",
      avatarUrl: "",
      stats: {
        projectsCount: state.projects.length,
        leadsCount: state.leads.length,
        revenue: `₹${totalIncome.toLocaleString("en-IN")}`,
      },
    },
    tasks,
    projects: state.projects,
    expenses,
    team: state.team_members,
    funnels: state.funnels,
    leads: state.leads,
    notifications: state.notifications,
    toggleTask: (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        analytics.track("task_completed", { id, title: task.title });
        void mutate(`tasks/${id}`, "PATCH", {
          status: task.completed ? "TODO" : "COMPLETED",
        });
      }
    },
    addTask: (t: Omit<Task, "id">) => {
      analytics.track("task_created", { title: t.title });
      return void mutate("tasks", "POST", {
        ...t,
        assignedUserId: t.assignedUserId || user?.id,
        status: "TODO",
      });
    },
    addExpense: (e: Omit<Expense, "id" | "type">) => {
      analytics.track("expense_added", { title: e.title, amount: e.amount });
      return void mutate("expenses", "POST", e);
    },
    addLead: (l: Omit<Lead, "id">) => {
      analytics.track("lead_created", { name: l.name });
      return void mutate("leads", "POST", l);
    },
    addProject: (p: Omit<Project, "id">) => {
      analytics.track("project_created", { name: p.name });
      return void mutate("projects", "POST", {
        ...p,
        memberIds: p.memberIds || ["user-1"],
      });
    },
    addTeamMember: (m: Omit<TeamMember, "id">) => void mutate("team_members", "POST", m),
    updateProjectProgress: (id: string, progress: number) =>
      void mutate(`projects/${id}`, "PATCH", { progress }),
    updateLeadStatus: (id: string, status: Lead["status"]) => {
      analytics.track("lead_status_changed", { id, status });
      return void mutate(`leads/${id}`, "PATCH", { status });
    },
    selectProject: (id: string) => {
      setCreateOnOpen(false);
      setActiveProjectId(id);
      navigateTo("project-details", "All", false);
    },
    selectFunnel: (id: string) => {
      setCreateOnOpen(false);
      setActiveFunnelId(id);
      navigateTo("funnel-details", "All", false);
    },
    markAllNotificationsRead: () => void mutate("notifications/read", "POST"),
    resetAllData: () => showToast("Use individual record actions to manage your data."),
    executionPercentage: totalTasksTodayCount
      ? Math.round((tasksCompletedTodayCount / totalTasksTodayCount) * 100)
      : 0,
    tasksLeftTodayCount: totalTasksTodayCount - tasksCompletedTodayCount,
    tasksCompletedTodayCount,
    totalTasksTodayCount,
    dayStreak,
    totalIncome,
    totalExpenses,
    totalFunds: state.finance?.funds ?? totalIncome - totalExpenses,
    totalSavings: state.finance?.savings ?? 0,
    netFunds: state.finance?.funds ?? totalIncome - totalExpenses,
    unreadNotificationCount: state.notifications.filter((n) => !n.read).length,
  };
}

const Context = createContext<ReturnType<typeof useController> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useController();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AppProvider");
  return value;
}
