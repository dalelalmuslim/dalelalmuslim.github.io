import { getDailyAyahs, getDailyMessages } from '../../services/content/content-client.js';

const homeFeedCache = {
    messages: null,
    dailyAyahs: null
};

export async function ensureMessagesDataLoaded() {
    if (homeFeedCache.messages) return homeFeedCache.messages;
    homeFeedCache.messages = getDailyMessages();
    return homeFeedCache.messages;
}

export async function ensureDailyAyahsDataLoaded() {
    if (homeFeedCache.dailyAyahs) return homeFeedCache.dailyAyahs;
    homeFeedCache.dailyAyahs = await getDailyAyahs();
    return homeFeedCache.dailyAyahs;
}

export function getMessagesData() {
    return homeFeedCache.messages;
}

export function getDailyAyahsData() {
    return homeFeedCache.dailyAyahs;
}
