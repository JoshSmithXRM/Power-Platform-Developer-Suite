// Solution Selector Utilities - shared functionality for solution selection across panels
class SolutionSelectorUtils {
    /**
     * Initialize a solution selector with configuration
     * @param {string} selectorId - ID of the solution select element
     * @param {Object} config - Configuration object
     * @param {Function} config.onSelectionChange - Callback when selection changes (selectorId, solutionId, previousSolutionId)
     */
    static initializeSelector(selectorId, config = {}) {
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Solution selector with ID '${selectorId}' not found`);
            return;
        }

        // Store configuration on the element
        selector._solutionConfig = config;

        // Add change event listener
        selector.addEventListener('change', (event) => {
            const newSolutionId = event.target.value;
            const previousSolutionId = selector._previousSolutionId || '';
            
            selector._previousSolutionId = newSolutionId;

            if (config.onSelectionChange && typeof config.onSelectionChange === 'function') {
                config.onSelectionChange(selectorId, newSolutionId, previousSolutionId);
            } else if (config.onSelectionChange && typeof window[config.onSelectionChange] === 'function') {
                window[config.onSelectionChange](selectorId, newSolutionId, previousSolutionId);
            }
        });

        console.log(`Solution selector '${selectorId}' initialized`);
        return selector;
    }

    /**
     * Load solutions into a selector
     * @param {string} selectorId - ID of the solution select element
     * @param {Array} solutions - Array of solution objects
     * @param {string} selectedSolutionId - ID of solution to select
     */
    static loadSolutions(selectorId, solutions, selectedSolutionId = null) {
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Solution selector with ID '${selectorId}' not found`);
            return;
        }

        // Clear existing options
        selector.innerHTML = '';

        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select a solution...';
        placeholderOption.disabled = true;
        selector.appendChild(placeholderOption);

        // Add solution options
        solutions.forEach(solution => {
            const option = document.createElement('option');
            option.value = solution.solutionId || solution.id;
            option.textContent = solution.uniqueName || solution.name;
            option.title = `${solution.friendlyName || solution.displayName || ''} (${solution.version || ''})`;
            selector.appendChild(option);
        });

        // Set selected value if provided
        if (selectedSolutionId) {
            selector.value = selectedSolutionId;
            selector._previousSolutionId = selectedSolutionId;
        } else if (solutions.length > 0) {
            // Auto-select Default solution if available
            const defaultSolution = solutions.find(s => 
                (s.uniqueName || s.name) === 'Default'
            );
            if (defaultSolution) {
                const solutionId = defaultSolution.solutionId || defaultSolution.id;
                selector.value = solutionId;
                selector._previousSolutionId = solutionId;
                
                // Trigger change event for auto-selection
                const changeEvent = new Event('change', { bubbles: true });
                selector.dispatchEvent(changeEvent);
            }
        }

        console.log(`Loaded ${solutions.length} solutions into selector '${selectorId}'`);
    }

    /**
     * Get the currently selected solution ID
     * @param {string} selectorId - ID of the solution select element
     * @returns {string|null} Selected solution ID or null
     */
    static getSelectedSolution(selectorId) {
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Solution selector with ID '${selectorId}' not found`);
            return null;
        }
        return selector.value || null;
    }

    /**
     * Set the selected solution
     * @param {string} selectorId - ID of the solution select element
     * @param {string} solutionId - ID of solution to select
     * @param {boolean} triggerChange - Whether to trigger change event (default: true)
     */
    static setSelectedSolution(selectorId, solutionId, triggerChange = true) {
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Solution selector with ID '${selectorId}' not found`);
            return;
        }

        const previousValue = selector.value;
        selector.value = solutionId;
        selector._previousSolutionId = solutionId;

        if (triggerChange && previousValue !== solutionId) {
            const changeEvent = new Event('change', { bubbles: true });
            selector.dispatchEvent(changeEvent);
        }
    }

    /**
     * Set loading state for the selector
     * @param {string} selectorId - ID of the solution select element
     * @param {boolean} isLoading - Whether selector is in loading state
     * @param {string} loadingText - Text to show while loading
     */
    static setLoadingState(selectorId, isLoading, loadingText = 'Loading solutions...') {
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Solution selector with ID '${selectorId}' not found`);
            return;
        }

        if (isLoading) {
            selector.innerHTML = `<option value="">${loadingText}</option>`;
            selector.disabled = true;
        } else {
            selector.disabled = false;
        }
    }

    /**
     * Clear the selector
     * @param {string} selectorId - ID of the solution select element
     * @param {string} placeholderText - Placeholder text to show
     */
    static clearSelector(selectorId, placeholderText = 'Select a solution...') {
        const selector = document.getElementById(selectorId);
        if (!selector) {
            console.warn(`Solution selector with ID '${selectorId}' not found`);
            return;
        }

        selector.innerHTML = `<option value="" disabled selected>${placeholderText}</option>`;
        selector._previousSolutionId = '';
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SolutionSelectorUtils = SolutionSelectorUtils;
}
