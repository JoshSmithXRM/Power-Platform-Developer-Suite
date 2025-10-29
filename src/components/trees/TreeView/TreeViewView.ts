import { CSS_CLASSES } from '../../base/ComponentConfig';
import { escapeHtml } from '../../base/HtmlUtils';
import { LoadingIndicatorView } from '../../base/LoadingIndicatorView';
import { SearchInputComponent } from '../../inputs/SearchInput/SearchInputComponent';

import { TreeViewConfig, TreeNode } from './TreeViewConfig';

/**
 * TreeViewView - HTML generation for TreeView component
 * This runs in Extension Host context and generates the HTML structure
 */
export class TreeViewView {
    /**
     * Generate the complete HTML for the TreeView component
     */
    public static generateHTML(
        config: TreeViewConfig,
        nodes: TreeNode[],
        loading: boolean = false,
        loadingMessage: string = 'Loading...',
        searchInput?: SearchInputComponent
    ): string {
        const {
            id,
            searchEnabled = true,
            className = 'tree-view'
        } = config;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            'tree-view-container',
            className
        ].filter(Boolean).join(' ');

        return `
            <div id="${escapeHtml(id)}" class="${containerClass}" data-component-id="${escapeHtml(id)}" data-component-type="TreeView">
                ${searchEnabled && searchInput ? `<div class="tree-view-search">${searchInput.generateHTML()}</div>` : ''}
                <div class="tree-view-content">
                    ${loading ? this.generateLoadingIndicator(loadingMessage) : this.generateTree(id, nodes)}
                </div>
            </div>
        `;
    }

    /**
     * Generate loading indicator HTML
     */
    private static generateLoadingIndicator(message: string): string {
        return LoadingIndicatorView.generate(message);
    }

    /**
     * Generate tree HTML
     */
    private static generateTree(componentId: string, nodes: TreeNode[]): string {
        if (!nodes || nodes.length === 0) {
            return `<ul class="tree-view-root"><div class="tree-view-empty">No items to display</div></ul>`;
        }

        return `<ul class="tree-view-root">${this.generateNodeList(componentId, nodes)}</ul>`;
    }

    /**
     * Generate list of tree nodes
     */
    private static generateNodeList(componentId: string, nodes: TreeNode[]): string {
        return nodes.map(node => this.generateNode(componentId, node)).join('');
    }

    /**
     * Generate a single tree node
     */
    private static generateNode(componentId: string, node: TreeNode): string {
        const hasChildren = (node.children && node.children.length > 0) || (node.hasChildren === true);
        const nodeClass = [
            'tree-node',
            hasChildren ? 'tree-node--has-children' : 'tree-node--leaf',
            node.expanded ? 'tree-node--expanded' : 'tree-node--collapsed',
            node.selectable !== false ? 'tree-node--selectable' : 'tree-node--not-selectable',
            `tree-node--type-${escapeHtml(node.type)}`
        ].filter(Boolean).join(' ');

        const childrenHtml = hasChildren && node.expanded && node.children && node.children.length > 0
            ? `<ul class="tree-children">${this.generateNodeList(componentId, node.children!)}</ul>`
            : '';

        return `
            <li class="${nodeClass}" data-node-id="${escapeHtml(node.id)}" data-node-type="${escapeHtml(node.type)}">
                <div class="tree-node-content">
                    ${hasChildren ? `<span class="tree-toggle" data-action="toggle">›</span>` : '<span class="tree-toggle tree-toggle--spacer"></span>'}
                    <span class="tree-icon">${escapeHtml(node.icon)}</span>
                    <span class="tree-label" title="${escapeHtml(node.label)}">${escapeHtml(node.label)}</span>
                </div>
                ${childrenHtml}
            </li>
        `;
    }
}
