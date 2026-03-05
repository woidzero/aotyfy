const SCOPE = "aotyfy";

export const KEYS = {
  ENABLED: "enabled",
  VERSION: "version",
  NOTIFICATIONS: "notifications",
  SHOW_SIDEBAR: "showSidebar",
  SHOW_NPB: "showNPB",
  STORAGE: "storage",
  STRICT: "strict",
} as const;

class _Field<T> {
  public readonly key: string;
  public value: T;

  constructor(key: string, value: T) {
    this.key = SCOPE + ":" + key;
    this.value = value;
  }

  public get(): T {
    return this.value;
  }

  public set(v: T): void {
    this.value = v;
    localStorage.setItem(this.key, JSON.stringify(this.value));
  }

  public toggle(this: _Field<boolean>, item: Spicetify.Menu.Item): void {
    this.set(!this.value);
    item.setState(this.value);
  }
}

class _Settings {
  public isEnabled: _Field<boolean>;
  public version: _Field<string>;
  public notifications: _Field<boolean>;
  public showSidebar: _Field<boolean>;
  public showNPB: _Field<boolean>;
  public storage: _Field<Record<string, string>>;
  public strict: _Field<boolean>;

  constructor() {
    this.isEnabled = new _Field(KEYS.ENABLED, this.get(KEYS.ENABLED, true));
    this.version = new _Field(KEYS.VERSION, this.get(KEYS.VERSION, "0.0.0"));
    this.notifications = new _Field(KEYS.NOTIFICATIONS, this.get(KEYS.NOTIFICATIONS, false));
    this.showSidebar = new _Field(KEYS.SHOW_SIDEBAR, this.get(KEYS.SHOW_SIDEBAR, true));
    this.showNPB = new _Field(KEYS.SHOW_NPB, this.get(KEYS.SHOW_NPB, true));
    this.storage = new _Field(KEYS.STORAGE, this.get(KEYS.STORAGE, {}));
    this.strict = new _Field(KEYS.STRICT, this.get(KEYS.STRICT, true));
  }

  private get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(`${SCOPE}:${key}`);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}

export const Settings = new _Settings();