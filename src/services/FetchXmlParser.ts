import { QueryOptions, FilterOperator, QueryFilter } from './DataverseQueryService';

export interface ParsedFetchXml {
    entity: string;
    attributes: string[];
    filters: QueryFilter[];
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    top?: number;
    linkEntities?: any[];
}

export interface ParsedLayoutXml {
    columns: {
        name: string;
        width?: string;
        displayName?: string;
    }[];
}

interface SimpleXmlElement {
    name: string;
    attributes: { [key: string]: string };
    children: SimpleXmlElement[];
    content?: string;
}

export class FetchXmlParser {
    /**
     * Simple XML parser for Node.js environment
     */
    private static parseXmlString(xmlString: string): SimpleXmlElement | null {
        try {
            // Remove XML declaration and normalize
            const cleanXml = xmlString.replace(/<\?xml[^>]*\?>/g, '').trim();
            
            // Find root element
            const rootMatch = cleanXml.match(/<(\w+)([^>]*)>(.*)<\/\1>/s);
            if (!rootMatch) {
                return null;
            }
            
            const rootName = rootMatch[1];
            const rootAttrs = this.parseAttributes(rootMatch[2] || '');
            const rootContent = rootMatch[3];
            
            return {
                name: rootName,
                attributes: rootAttrs,
                children: this.parseChildren(rootContent),
                content: rootContent
            };
        } catch (error) {
            console.error('Error parsing XML:', error);
            return null;
        }
    }
    
    /**
     * Parse XML attributes from attribute string
     */
    private static parseAttributes(attrString: string): { [key: string]: string } {
        const attrs: { [key: string]: string } = {};
        const attrPattern = /(\w+)=["']([^"']*)["']/g;
        let match;
        
        while ((match = attrPattern.exec(attrString)) !== null) {
            attrs[match[1]] = match[2];
        }
        
        return attrs;
    }
    
    /**
     * Parse child elements from content
     */
    private static parseChildren(content: string): SimpleXmlElement[] {
        const children: SimpleXmlElement[] = [];
        const elementPattern = /<(\w+)([^>]*?)(?:\/>|>(.*?)<\/\1>)/gs;
        let match;
        
        while ((match = elementPattern.exec(content)) !== null) {
            const name = match[1];
            const attrs = this.parseAttributes(match[2] || '');
            const innerContent = match[3] || '';
            
            children.push({
                name: name,
                attributes: attrs,
                children: innerContent ? this.parseChildren(innerContent) : [],
                content: innerContent
            });
        }
        
        return children;
    }
    
    /**
     * Find elements by name in the parsed XML structure
     */
    private static findElements(root: SimpleXmlElement, tagName: string): SimpleXmlElement[] {
        const results: SimpleXmlElement[] = [];
        
        if (root.name === tagName) {
            results.push(root);
        }
        
        for (const child of root.children) {
            results.push(...this.findElements(child, tagName));
        }
        
        return results;
    }
    
    /**
     * Find first element by name
     */
    private static findElement(root: SimpleXmlElement, tagName: string): SimpleXmlElement | null {
        const elements = this.findElements(root, tagName);
        return elements.length > 0 ? elements[0] : null;
    }
    
    /**
     * Parse FetchXML string to extract query parameters
     */
    static parseFetchXml(fetchXml: string): ParsedFetchXml | null {
        try {
            const doc = this.parseXmlString(fetchXml);
            if (!doc) {
                console.error('Failed to parse FetchXML');
                return null;
            }
            
            const fetchElement = this.findElement(doc, 'fetch');
            const entityElement = this.findElement(doc, 'entity');
            
            if (!entityElement) {
                console.error('No entity element found in FetchXML');
                return null;
            }

            const result: ParsedFetchXml = {
                entity: entityElement.attributes['name'] || '',
                attributes: [],
                filters: []
            };

            // Parse top/limit
            const topAttr = fetchElement?.attributes['top'];
            if (topAttr) {
                result.top = parseInt(topAttr, 10);
            }

            // Parse attributes
            const attributeElements = this.findElements(entityElement, 'attribute');
            attributeElements.forEach(attr => {
                const name = attr.attributes['name'];
                if (name) {
                    result.attributes.push(name);
                }
            });

            // Parse filters
            const filterElements = this.findElements(entityElement, 'filter');
            const filters: QueryFilter[] = [];
            
            filterElements.forEach(filterElement => {
                const conditionElements = this.findElements(filterElement, 'condition');
                conditionElements.forEach(condition => {
                    const attribute = condition.attributes['attribute'];
                    const operator = condition.attributes['operator'];
                    const value = condition.attributes['value'];
                    
                    if (attribute && operator) {
                        const filter = this.convertConditionToFilter(attribute, operator, value);
                        if (filter) {
                            filters.push(filter);
                        }
                    }
                });

                // Check for filter logical operator (and/or)
                const filterType = filterElement.attributes['type'] || 'and';
                
                // Apply logical operators to filters
                filters.forEach((filter, index) => {
                    if (index > 0) {
                        filter.logicalOperator = filterType as 'and' | 'or';
                    }
                });
            });

            result.filters = filters;

            // Parse order by
            const orderElements = this.findElements(entityElement, 'order');
            if (orderElements.length > 0) {
                result.orderBy = [];
                orderElements.forEach(order => {
                    const attribute = order.attributes['attribute'];
                    const descending = order.attributes['descending'] === 'true';
                    if (attribute) {
                        result.orderBy!.push({
                            field: attribute,
                            direction: descending ? 'desc' : 'asc'
                        });
                    }
                });
            }

            // Parse link entities (joins) - simplified for now
            const linkEntities = this.findElements(entityElement, 'link-entity');
            if (linkEntities.length > 0) {
                result.linkEntities = [];
                linkEntities.forEach(link => {
                    const linkData = {
                        name: link.attributes['name'],
                        from: link.attributes['from'],
                        to: link.attributes['to'],
                        alias: link.attributes['alias'],
                        linkType: link.attributes['link-type'] || 'inner'
                    };
                    result.linkEntities!.push(linkData);
                    
                    // Also get attributes from linked entity
                    const linkAttributes = this.findElements(link, 'attribute');
                    linkAttributes.forEach(attr => {
                        const name = attr.attributes['name'];
                        if (name && linkData.alias) {
                            result.attributes.push(`${linkData.alias}.${name}`);
                        }
                    });
                });
            }

            return result;
        } catch (error) {
            console.error('Error parsing FetchXML:', error);
            return null;
        }
    }

    /**
     * Convert FetchXML condition to OData filter
     */
    private static convertConditionToFilter(attribute: string, operator: string, value: string | null): QueryFilter | null {
        let filterOp: FilterOperator;
        let filterValue: any = value;

        // Handle special operators
        switch (operator) {
            case 'eq':
                filterOp = FilterOperator.Equals;
                break;
            case 'ne':
            case 'neq':
                filterOp = FilterOperator.NotEquals;
                break;
            case 'gt':
                filterOp = FilterOperator.GreaterThan;
                break;
            case 'ge':
                filterOp = FilterOperator.GreaterThanOrEqual;
                break;
            case 'lt':
                filterOp = FilterOperator.LessThan;
                break;
            case 'le':
                filterOp = FilterOperator.LessThanOrEqual;
                break;
            case 'like':
                filterOp = FilterOperator.Contains;
                // Remove wildcards for OData
                if (filterValue) {
                    filterValue = filterValue.replace(/%/g, '');
                }
                break;
            case 'not-like':
                // OData doesn't have a direct not-contains, will need special handling
                filterOp = FilterOperator.NotEquals;
                break;
            case 'begins-with':
                filterOp = FilterOperator.StartsWith;
                break;
            case 'ends-with':
                filterOp = FilterOperator.EndsWith;
                break;
            case 'null':
                filterOp = FilterOperator.Null;
                filterValue = null;
                break;
            case 'not-null':
                filterOp = FilterOperator.NotNull;
                filterValue = null;
                break;
            case 'in':
                filterOp = FilterOperator.In;
                // Parse comma-separated values
                if (filterValue) {
                    filterValue = filterValue.split(',').map((v: string) => v.trim());
                }
                break;
            case 'eq-userid':
                // Special case for current user
                // This needs to be handled at runtime with actual user ID
                filterOp = FilterOperator.Equals;
                filterValue = 'CURRENT_USER'; // Placeholder to be replaced
                break;
            case 'eq-userteams':
                // Teams of current user - needs special handling
                filterOp = FilterOperator.In;
                filterValue = 'USER_TEAMS'; // Placeholder
                break;
            default:
                console.warn(`Unsupported FetchXML operator: ${operator}`);
                return null;
        }

        return {
            field: attribute,
            operator: filterOp,
            value: filterValue
        };
    }

    /**
     * Parse LayoutXML to extract column information
     */
    static parseLayoutXml(layoutXml: string): ParsedLayoutXml | null {
        try {
            const doc = this.parseXmlString(layoutXml);
            if (!doc) {
                console.error('Failed to parse LayoutXML');
                return null;
            }
            
            const cellElements = this.findElements(doc, 'cell');
            const columns: ParsedLayoutXml['columns'] = [];

            cellElements.forEach(cell => {
                const name = cell.attributes['name'];
                if (name) {
                    columns.push({
                        name: name,
                        width: cell.attributes['width'] || undefined,
                        displayName: name // Could be enhanced with metadata
                    });
                }
            });

            return { columns };
        } catch (error) {
            console.error('Error parsing LayoutXML:', error);
            return null;
        }
    }

    /**
     * Convert parsed FetchXML to QueryOptions for OData
     */
    static fetchXmlToQueryOptions(parsed: ParsedFetchXml): QueryOptions {
        const options: QueryOptions = {};

        // Set select fields
        if (parsed.attributes.length > 0) {
            options.select = parsed.attributes;
        }

        // Set filters
        if (parsed.filters.length > 0) {
            options.filters = parsed.filters;
        }

        // Set ordering
        if (parsed.orderBy) {
            options.orderBy = parsed.orderBy;
        }

        // Set top/limit
        if (parsed.top) {
            options.maxPageSize = parsed.top;
        }

        // Handle link entities (simplified - just note they exist)
        if (parsed.linkEntities && parsed.linkEntities.length > 0) {
            // For now, we'll need to handle these separately
            // OData uses $expand for related entities
            options.expand = parsed.linkEntities
                .filter(link => link.name)
                .map(link => link.name);
        }

        return options;
    }
}