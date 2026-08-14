(function () {
      if (window.ValmontAnalytics && typeof window.ValmontAnalytics.initAnalytics === 'function') {
        try { window.ValmontAnalytics.initAnalytics(); } catch (e) {}
      }
    })();
