class AppState {
  constructor() {
    this.state = {
      user: null,
      theme: 'light',
      language: 'ne',
      posts: [],
      stories: [],
      friends: [],
      notifications: [],
      messages: []
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

window.appState = new AppState();
