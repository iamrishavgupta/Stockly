'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@/lib/better-auth/auth';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}

// Resolve the currently authenticated user's id (falls back to null when signed out)
async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  } catch (err) {
    console.error('getCurrentUserId error:', err);
    return null;
  }
}

export type UserWatchlistItem = {
  symbol: string;
  company: string;
  addedAt: Date;
};

export async function getUserWatchlist(): Promise<UserWatchlistItem[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    await connectToDatabase();

    const items = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();
    return items.map((i) => ({
      symbol: String(i.symbol),
      company: String(i.company),
      addedAt: (i.addedAt as Date) ?? new Date(),
    }));
  } catch (err) {
    console.error('getUserWatchlist error:', err);
    return [];
  }
}

export async function isInWatchlist(symbol: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || !symbol) return false;

    await connectToDatabase();
    const existing = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() }).lean();
    return Boolean(existing);
  } catch (err) {
    console.error('isInWatchlist error:', err);
    return false;
  }
}

export async function addToWatchlist(symbol: string, company: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'You must be signed in to manage your watchlist' };
    if (!symbol) return { success: false, error: 'Symbol is required' };

    await connectToDatabase();

    await Watchlist.updateOne(
      { userId, symbol: symbol.toUpperCase() },
      { $setOnInsert: { userId, symbol: symbol.toUpperCase(), company: company || symbol.toUpperCase(), addedAt: new Date() } },
      { upsert: true }
    );

    revalidatePath('/watchlist');
    return { success: true };
  } catch (err) {
    console.error('addToWatchlist error:', err);
    return { success: false, error: 'Failed to add to watchlist' };
  }
}

export async function removeFromWatchlist(symbol: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'You must be signed in to manage your watchlist' };
    if (!symbol) return { success: false, error: 'Symbol is required' };

    await connectToDatabase();

    await Watchlist.deleteOne({ userId, symbol: symbol.toUpperCase() });

    revalidatePath('/watchlist');
    return { success: true };
  } catch (err) {
    console.error('removeFromWatchlist error:', err);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}
