import { CSS_CLASSES } from '../../base/ComponentConfig';
import { escapeHtml } from '../../base/HtmlUtils';

import { TreeViewConfig, TreeNode } from './TreeViewConfig';

/**
 * TreeViewView - HTML generation for TreeView component
 * This runs in Extension Host context and generates the HTML structure
 */
export class TreeViewView {
    /**
     * Generate the complete HTML for the TreeView component
     */
    public static generateHTML(config: TreeViewConfig, nodes: TreeNode[]): string {
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
                ${searchEnabled ? this.generateSearchBox(id) : ''}
                <div class="tree-view-content">
                    ${this.generateTree(id, nodes)}
                </div>
            </div>
        `;
    }

    /**
     * Generate search box HTML
     */
    private static generateSearchBox(componentId: string): string {
        return `
            <div class="tree-view-search">
                <input
                    type="text"
                    id="${escapeHtml(componentId)}-search"
                    class="tree-view-search-input"
                    placeholder="Search..."
                    aria-label="Search tree"
                />
                <span class="tree-view-search-icon">🔍</span>
            </div>
        `;
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
        const hasChildren = node.children && node.children.length > 0;
        const expandIcon = hasChildren ? (node.expanded ? '▼' : '▶') : '';
        const nodeClass = [
            'tree-node',
            hasChildren ? 'tree-node--has-children' : 'tree-node--leaf',
            node.expanded ? 'tree-node--expanded' : 'tree-node--collapsed',
            node.selectable !== false ? 'tree-node--selectable' : 'tree-node--not-selectable',
            `tree-node--type-${escapeHtml(node.type)}`
        ].filter(Boolean).join(' ');

        const childrenHtml = hasChildren && node.expanded
            ? `<ul class="tree-children">${this.generateNodeList(componentId, node.children!)}</ul>`
            : '';

        return `
            <li class="${nodeClass}" data-node-id="${escapeHtml(node.id)}" data-node-type="${escapeHtml(node.type)}">
                <div class="tree-node-content">
                    ${hasChildren ? `<span class="tree-toggle" data-action="toggle">${expandIcon}</span>` : '<span class="tree-toggle tree-toggle--spacer"></span>'}
                    <span class="tree-icon">${escapeHtml(node.icon)}</span>
                    <span class="tree-label" title="${escapeHtml(node.label)}">${escapeHtml(node.label)}</span>
                </div>
                ${childrenHtml}
            </li>
        `;
    }
}
