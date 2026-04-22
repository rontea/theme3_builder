"use strict";

const phase5ContentSeed = {
    collections: [
        {
            slug: "supporters",
            name: "Supporters",
            schema: {
                fields: [
                    { name: "name", label: "Name", type: "text" },
                    { name: "tier", label: "Tier", type: "text" },
                    { name: "url", label: "URL", type: "text" },
                    { name: "active", label: "Active", type: "boolean" },
                    { name: "sort_order", label: "Sort Order", type: "number" }
                ]
            },
            entries: [
                {
                    entryKey: "openai",
                    status: "published",
                    sortOrder: 1,
                    data: { name: "OpenAI", tier: "founding", url: "https://openai.com", active: true, sort_order: 1 }
                },
                {
                    entryKey: "anthropic",
                    status: "published",
                    sortOrder: 2,
                    data: { name: "Anthropic", tier: "visionary", url: "https://anthropic.com", active: true, sort_order: 2 }
                },
                {
                    entryKey: "community-friends",
                    status: "published",
                    sortOrder: 3,
                    data: {
                        name: "Community Friends",
                        tier: "community",
                        url: "https://example.com/community",
                        active: true,
                        sort_order: 3
                    }
                }
            ]
        },
        {
            slug: "projects",
            name: "Projects",
            schema: {
                fields: [
                    { name: "title", label: "Title", type: "text" },
                    { name: "slug", label: "Slug", type: "text" },
                    { name: "category", label: "Category", type: "text" },
                    { name: "summary", label: "Summary", type: "text" },
                    { name: "image_src", label: "Image Source", type: "text" },
                    { name: "image_alt", label: "Image Alt", type: "text" },
                    { name: "detail_url", label: "Detail URL", type: "text" },
                    { name: "year", label: "Year", type: "text" },
                    { name: "featured", label: "Featured", type: "boolean" },
                    { name: "active", label: "Active", type: "boolean" },
                    { name: "sort_order", label: "Sort Order", type: "number" }
                ]
            },
            entries: [
                {
                    entryKey: "aimana",
                    status: "published",
                    sortOrder: 1,
                    data: {
                        title: "AIMANA",
                        slug: "aimana",
                        category: "AI Animation",
                        summary: "AIMANA AI is an all-in-one creative platform for generation, management, and transformation.",
                        image_src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
                        image_alt: "AIMANA",
                        detail_url: "aimana.html",
                        year: "2024",
                        featured: true,
                        active: true,
                        sort_order: 1
                    }
                },
                {
                    entryKey: "theme-3-builder",
                    status: "published",
                    sortOrder: 2,
                    data: {
                        title: "THEME_3 Builder",
                        slug: "theme-3-builder",
                        category: "Cloud Systems",
                        summary: "Next-generation cloud infrastructure visualization for real-time edge computing networks.",
                        image_src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
                        image_alt: "THEME_3 Builder",
                        detail_url: "voyager.html",
                        year: "2024",
                        featured: true,
                        active: true,
                        sort_order: 2
                    }
                },
                {
                    entryKey: "neural-canvas",
                    status: "published",
                    sortOrder: 3,
                    data: {
                        title: "NEURAL CANVAS",
                        slug: "neural-canvas",
                        category: "Engineering",
                        summary: "Visual tooling for rapid experiments in generative product interfaces.",
                        image_src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800",
                        image_alt: "Neural Canvas",
                        detail_url: "neural.html",
                        year: "2023",
                        featured: false,
                        active: true,
                        sort_order: 3
                    }
                },
                {
                    entryKey: "oscillate",
                    status: "published",
                    sortOrder: 4,
                    data: {
                        title: "OSCILLATE",
                        slug: "oscillate",
                        category: "Product",
                        summary: "Product experiments in interaction systems and motion-heavy storytelling.",
                        image_src: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1200",
                        image_alt: "Oscillate",
                        detail_url: "oscillate.html",
                        year: "2023",
                        featured: false,
                        active: true,
                        sort_order: 4
                    }
                }
            ]
        },
        {
            slug: "insights",
            name: "Insights",
            schema: {
                fields: [
                    { name: "title", label: "Title", type: "text" },
                    { name: "slug", label: "Slug", type: "text" },
                    { name: "category", label: "Category", type: "text" },
                    { name: "image_src", label: "Image Source", type: "text" },
                    { name: "image_alt", label: "Image Alt", type: "text" },
                    { name: "detail_url", label: "Detail URL", type: "text" },
                    { name: "active", label: "Active", type: "boolean" },
                    { name: "sort_order", label: "Sort Order", type: "number" }
                ]
            },
            entries: [
                {
                    entryKey: "future-of-ai-systems",
                    status: "published",
                    sortOrder: 1,
                    data: {
                        title: "The Future of AI Systems",
                        slug: "future-of-ai-systems",
                        category: "Architecture",
                        image_src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800",
                        image_alt: "The Future of AI Systems",
                        detail_url: "future-ai-systems.html",
                        active: true,
                        sort_order: 1
                    }
                },
                {
                    entryKey: "edge-networks",
                    status: "published",
                    sortOrder: 2,
                    data: {
                        title: "Edge Networks",
                        slug: "edge-networks",
                        category: "Engineering",
                        image_src: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=800",
                        image_alt: "Edge Networks",
                        detail_url: "edge-networks.html",
                        active: true,
                        sort_order: 2
                    }
                },
                {
                    entryKey: "content-strategy",
                    status: "published",
                    sortOrder: 3,
                    data: {
                        title: "Content Strategy",
                        slug: "content-strategy",
                        category: "Minimalism",
                        image_src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
                        image_alt: "Content Strategy",
                        detail_url: "content-strategy.html",
                        active: true,
                        sort_order: 3
                    }
                }
            ]
        },
        {
            slug: "cta_blocks",
            name: "CTA Blocks",
            schema: {
                fields: [
                    { name: "key", label: "Key", type: "text" },
                    { name: "heading", label: "Heading", type: "text" },
                    { name: "button_label", label: "Button Label", type: "text" },
                    { name: "button_url", label: "Button URL", type: "text" },
                    { name: "active", label: "Active", type: "boolean" }
                ]
            },
            entries: [
                {
                    entryKey: "about-cta",
                    status: "published",
                    sortOrder: 1,
                    data: {
                        key: "about-cta",
                        heading: "Let's start a conversation.",
                        button_label: "Contact Me",
                        button_url: "mailto:hello@rontea.com",
                        active: true
                    }
                }
            ]
        }
    ]
};

module.exports = {
    phase5ContentSeed
};
