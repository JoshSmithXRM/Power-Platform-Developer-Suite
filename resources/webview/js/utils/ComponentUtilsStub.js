/**
 * ComponentUtilsStub - Temporary stub for behavior registration
 * This allows behaviors to register themselves before the full ComponentUtils loads
 */

// Create a stub ComponentUtils that behaviors can register with
if (!window.ComponentUtils) {
    window.ComponentUtils = {
        pendingBehaviorRegistrations: [],
        
        // Stub registration method that queues registrations
        registerBehavior: function(name, behaviorClass) {
            console.log(`ComponentUtilsStub: Queuing registration for ${name}`);
            this.pendingBehaviorRegistrations.push({ name, behaviorClass });
        }
    };
    
    console.log('ComponentUtilsStub: Stub created for behavior registration');
}