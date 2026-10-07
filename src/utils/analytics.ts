// HAN Privacy-Conscious Analytics System

export type AnalyticsEvent =
  | "app_opened"
  | "login_success"
  | "logout"
  | "task_created"
  | "task_completed"
  | "project_created"
  | "expense_added"
  | "lead_created"
  | "lead_status_changed"
  | "notification_opened"
  | "funnel_step_completed"
  | "offline_sync_triggered";

export interface EventProperties {
  userId?: string;
  role?: string;
  entityId?: string;
  category?: string;
  [key: string]: unknown;
}

class AnalyticsService {
  private enabled: boolean = true;

  public init(): void {
    if (typeof window !== "undefined") {
      this.track("app_opened", {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    }
  }

  public track(event: AnalyticsEvent, properties?: EventProperties): void {
    if (!this.enabled) return;
    const payload = {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
    };

    if (import.meta.env.DEV) {
      console.log(`[ANALYTICS] ${event}`, payload.properties);
    }
  }
}

export const analytics = new AnalyticsService();
