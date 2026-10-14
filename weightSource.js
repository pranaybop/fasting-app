// Pluggable weight sources. Add real integrations (e.g. Apple HealthKit via a native wrapper) here.
window.WeightSources = {
  manual: { id: "manual", label: "Manual", available: true },
  appleHealth: {
    id: "apple_health", label: "Apple Health", available: false,
    async importWeights() { throw new Error("Apple Health import is coming soon. It needs a native iOS wrapper (HealthKit)."); }
  }
};
