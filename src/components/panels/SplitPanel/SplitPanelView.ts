/**
 * SplitPanelView - Generates HTML for Split Panel Component
 */

import { SplitPanelConfig } from './SplitPanelConfig';

export class SplitPanelView {
    /**
     * Generate complete split panel HTML
     */
    static generateHTML(config: SplitPanelConfig): string {
        const orientationClass = config.orientation === 'vertical' ? 'split-panel-vertical' : 'split-panel-horizontal';
        const resizableClass = config.resizable ? 'split-panel-resizable' : '';
        const rightHiddenClass = config.rightPanelDefaultHidden ? 'split-panel-right-hidden' : '';

        const leftSize = config.rightPanelDefaultHidden ? 100 : config.initialSplit;
        const rightSize = config.rightPanelDefaultHidden ? 0 : (100 - config.initialSplit);

        return `
            <div
                class="split-panel ${orientationClass} ${resizableClass} ${rightHiddenClass}"
                id="${config.id}"
                data-component="split-panel"
                data-orientation="${config.orientation}"
                data-min-size="${config.minSize}"
                data-resizable="${config.resizable}"
                data-right-closable="${config.rightPanelClosable}"
            >
                <div
                    class="split-panel-left"
                    data-panel="left"
                    style="${config.orientation === 'horizontal' ? `width: ${leftSize}%` : `height: ${leftSize}%`}"
                >
                    ${config.leftContent}
                </div>

                ${config.resizable ? `
                    <div
                        class="split-panel-divider"
                        data-divider
                        data-orientation="${config.orientation}"
                    >
                        <div class="split-panel-divider-handle"></div>
                    </div>
                ` : ''}

                <div
                    class="split-panel-right"
                    data-panel="right"
                    style="${config.orientation === 'horizontal' ? `width: ${rightSize}%` : `height: ${rightSize}%`}; ${config.rightPanelDefaultHidden ? 'display: none;' : ''}"
                >
                    ${config.rightPanelClosable ? `
                        <div class="split-panel-close-btn" data-action="closeRightPanel" title="Close panel">
                            ×
                        </div>
                    ` : ''}
                    <div class="split-panel-right-content">
                        ${config.rightContent}
                    </div>
                </div>
            </div>
        `;
    }
}
