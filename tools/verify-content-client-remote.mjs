import assert from 'node:assert/strict';

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(String(key), String(value));
    }

    removeItem(key) {
        this.store.delete(String(key));
    }

    clear() {
        this.store.clear();
    }
}

const remoteVersions = Object.freeze({
    app_config_version: '2026.04.18-app-config',
    azkar_version: '2026.04.18-azkar',
    duas_version: '2026.04.18-duas',
    stories_version: '2026.04.18-stories',
    daily_content_version: '2026.04.18-daily'
});

const remotePayloads = Object.freeze({
    '/api/public/content/app-config': {
        appId: 'dalil-almuslim',
        appNameAr: 'دليل المسلم',
        appNameEn: 'Dalil Almuslim',
        appVersion: '2.1.0',
        schemaVersion: 13
    },
    '/api/public/content/azkar': {
        categories: [
            {
                slug: 'azkar-morning',
                title: 'أذكار الصباح',
                description: 'Remote payload',
                icon: 'fa-sun',
                period: 'morning',
                sortOrder: 1,
                estimatedMinutes: 3,
                accentTone: 'amber',
                reminderDefault: '06:00',
                isDaily: true,
                preview: 'Remote azkar preview',
                itemCount: 1,
                itemIds: ['morning-1'],
                category: 'أذكار الصباح',
                azkar: [
                    {
                        id: 'morning-1',
                        legacyId: 1,
                        categorySlug: 'azkar-morning',
                        categoryTitle: 'أذكار الصباح',
                        text: 'Remote azkar item',
                        repeatTarget: 1,
                        reference: 'Remote reference'
                    }
                ]
            }
        ],
        source: 'remote-test'
    },
    '/api/public/content/duas': [
        {
            slug: 'sleep',
            key: 'sleep',
            title: 'دعاء النوم',
            icon: 'fa-moon',
            tone: 'indigo',
            items: [
                {
                    id: 1,
                    text: 'Remote dua item',
                    referenceText: 'Remote dua ref',
                    reference: null,
                    source: 'Remote source',
                    repeat: 1,
                    categorySlug: 'sleep',
                    categoryTitle: 'دعاء النوم'
                }
            ],
            itemCount: 1,
            previewText: 'Remote dua item',
            sourceSummary: 'Remote source'
        }
    ],
    '/api/public/content/stories': [
        {
            slug: 'prophets',
            key: 'prophets',
            title: 'قصص الأنبياء',
            icon: 'fa-book',
            accentTone: 'emerald',
            stories: [
                {
                    id: 1,
                    storyKey: 'prophets:1',
                    categorySlug: 'prophets',
                    categoryTitle: 'قصص الأنبياء',
                    title: 'Remote story title',
                    story: 'Remote story body',
                    excerpt: 'Remote story excerpt',
                    lesson: 'Remote lesson',
                    source: 'Remote source',
                    readingMinutes: 1
                }
            ],
            storyCount: 1,
            previewTitle: 'Remote story title',
            previewExcerpt: 'Remote story excerpt',
            totalReadingMinutes: 1,
            isFeatured: true
        }
    ],
    '/api/public/content/daily-content': {
        messages: [
            {
                id: 1,
                message: 'Remote daily message'
            }
        ],
        ayahs: [
            {
                surah: 'Al-Fatihah',
                ayah: 1,
                text: 'Remote ayah text'
            }
        ]
    }
});

function buildEnvelope(data, meta = {}) {
    return {
        ok: true,
        data,
        meta
    };
}

function createFetchStub() {
    return async function fetchStub(input) {
        const url = new URL(typeof input === 'string' ? input : input.url);

        if (url.pathname === '/api/public/versions') {
            return new Response(JSON.stringify(buildEnvelope({
                versions: remoteVersions,
                sections: []
            })), {
                status: 200,
                headers: {
                    'content-type': 'application/json; charset=utf-8'
                }
            });
        }

        if (remotePayloads[url.pathname]) {
            return new Response(JSON.stringify(buildEnvelope(remotePayloads[url.pathname], {
                sectionId: url.pathname.split('/').pop()
            })), {
                status: 200,
                headers: {
                    'content-type': 'application/json; charset=utf-8'
                }
            });
        }

        if (url.pathname === '/data/home/home-ayahs.json') {
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: {
                    'content-type': 'application/json; charset=utf-8'
                }
            });
        }

        return new Response('Not found', { status: 404 });
    };
}

async function main() {
    globalThis.localStorage = new MemoryStorage();
    globalThis.fetch = createFetchStub();

    if (!globalThis.location) {
        Object.defineProperty(globalThis, 'location', {
            value: { origin: 'https://dalil-almuslim.test' },
            configurable: true
        });
    }

    if (!globalThis.navigator) {
        Object.defineProperty(globalThis, 'navigator', {
            value: { onLine: true },
            configurable: true
        });
    }

    const contentClient = await import('../js/services/content/content-client.js');

    const summary = await contentClient.primePublicContentFoundation({ forceRemoteSync: true, eager: true });
    assert.equal(summary.ok, true, 'content foundation summary should be ok');
    assert.equal(summary.remoteCachedCount, 5, 'all public content sections should be cached from remote');

    const versions = contentClient.getPublicContentVersions();
    assert.equal(versions.duas_version, remoteVersions.duas_version, 'remote duas version should be persisted');
    assert.equal(versions.stories_version, remoteVersions.stories_version, 'remote stories version should be persisted');

    const duasCatalog = contentClient.getDuasCatalog();
    assert.equal(duasCatalog[0]?.items?.[0]?.text, 'Remote dua item', 'sync duas selector should read remote-cached payload');

    const story = contentClient.getStoryByKey('prophets:1');
    assert.equal(story?.title, 'Remote story title', 'story lookup should use remote-cached payload');

    const azkarCategory = await contentClient.getAzkarCategoryBySlug('azkar-morning');
    assert.equal(azkarCategory?.azkar?.[0]?.text, 'Remote azkar item', 'azkar category lookup should use remote-cached payload');

    const dailyMessages = contentClient.getDailyMessages();
    assert.equal(dailyMessages[0]?.message, 'Remote daily message', 'daily messages should use remote-cached payload');

    console.log(JSON.stringify({
        ok: true,
        checked: [
            'remote versions sync',
            'remote payload caching',
            'sync duas/stories accessors',
            'async azkar accessors',
            'daily content cache reuse'
        ]
    }, null, 2));
}

main().catch((error) => {
    console.error('[verify-content-client-remote] Verification failed.');
    console.error(error);
    process.exitCode = 1;
});
