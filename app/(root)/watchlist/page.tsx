import Link from "next/link";
import WatchlistButton from "@/components/WatchlistButton";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";

// This page is per-user (reads the session via headers), so it must be dynamic.
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const items = await getUserWatchlist();

  return (
    <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
      <section className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-100">My Watchlist</h1>
          <span className="text-sm text-gray-500">
            {items.length} {items.length === 1 ? "stock" : "stocks"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-[#141414] py-16 text-center">
            <p className="text-lg text-gray-300">Your watchlist is empty</p>
            <p className="mt-2 text-sm text-gray-500">
              Search for a stock and add it to start tracking it here.
            </p>
            <Link
              href="/"
              className="mt-6 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-400 transition-colors"
            >
              Browse stocks
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-[#1a1a1a] text-sm text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((item) => (
                  <tr key={item.symbol} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/stocks/${item.symbol}`}
                        className="text-gray-100 hover:text-yellow-500 transition-colors"
                      >
                        {item.company}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{item.symbol}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(item.addedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <WatchlistButton
                          symbol={item.symbol}
                          company={item.company}
                          isInWatchlist={true}
                          type="icon"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
