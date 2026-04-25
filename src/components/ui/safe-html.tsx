"use client";

import { useMemo, useState, useEffect } from "react";
import { sanitize } from "@/lib/sanitize";
import * as LucideIcons from "lucide-react";
import React from "react";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

/**
 * Converts a DOM node to a React element recursively.
 * This avoids the flickering issue caused by createRoot/useEffect.
 */
function domToReact(node: Node, index: number): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  // Special handling for Lucide Icons
  if (tagName === "span" && element.hasAttribute("data-lucide-icon")) {
    const name = element.getAttribute("name");
    const size = parseInt(element.getAttribute("size") || "24");
    const textAlign = element.style.textAlign;
    
    if (name) {
      const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
      const isValid = typeof IconComponent === 'function' || (typeof IconComponent === 'object' && (IconComponent.$$typeof || IconComponent.render));
      
      const icon = isValid ? (
        <IconComponent 
          size={size} 
          color="currentColor" 
        />
      ) : (
        <LucideIcons.HelpCircle size={size} color="currentColor" />
      );

      // Wrap in alignment span if needed (use span instead of div to avoid invalid nesting in <p>)
      if (textAlign === 'center' || textAlign === 'right') {
        return (
          <span 
            key={index}
            style={{ 
              display: 'flex', 
              justifyContent: textAlign === 'center' ? 'center' : 'flex-end',
              width: '100%',
              margin: '4px 0'
            }}
          >
            {icon}
          </span>
        );
      }

      return (
        <span 
          key={index} 
          style={{ 
            display: 'inline-flex', 
            verticalAlign: 'middle',
            margin: '0 2px'
          }}
        >
          {icon}
        </span>
      );
    }
  }

  // Handle standard elements
  const props: any = { key: index };
  
  // Copy attributes to props
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name === "class") {
      props.className = attr.value;
    } else if (attr.name === "style") {
      // Very basic style parsing (for alignment/images)
      const styleObj: any = {};
      attr.value.split(";").forEach(s => {
        const [colonIndex] = [s.indexOf(":")];
        if (colonIndex > 0) {
          const k = s.substring(0, colonIndex).trim();
          const v = s.substring(colonIndex + 1).trim();
          const camelK = k.replace(/-([a-z])/g, g => g[1].toUpperCase());
          styleObj[camelK] = v;
        }
      });
      props.style = styleObj;
    } else {
      props[attr.name] = attr.value;
    }
  }

  // Special handling for image alignment
  // Images are inline by default, so text-align on the img tag itself is ignored.
  // We convert it to block + auto margins for centering/right alignment.
  if (tagName === "img" && props.style?.textAlign) {
    const textAlign = props.style.textAlign;
    if (textAlign === 'center' || textAlign === 'right') {
      props.style = {
        ...props.style,
        display: 'block',
        marginLeft: 'auto',
        marginRight: textAlign === 'center' ? 'auto' : '0'
      };
    }
  }

  // Void elements cannot have children in React
  const voidElements = ["img", "br", "hr", "input", "meta", "link", "area", "base", "col", "embed", "param", "source", "track", "wbr"];
  if (voidElements.includes(tagName)) {
    return React.createElement(tagName, props);
  }

  // Recursively convert children
  const children = Array.from(element.childNodes).map((child, i) => domToReact(child, i));

  return React.createElement(tagName, props, children);
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const sanitized = useMemo(() => sanitize(html), [html]);

  const content = useMemo(() => {
    if (!mounted || !html) return null;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, "text/html");
    
    return Array.from(doc.body.childNodes).map((node, i) => domToReact(node, i));
  }, [sanitized, mounted, html]);

  // If not mounted, render the raw sanitized HTML to avoid hydration mismatch
  if (!mounted) {
    return (
      <div 
        className={className} 
        dangerouslySetInnerHTML={{ __html: sanitized }} 
      />
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
