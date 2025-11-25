import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ulid } from "ulid";
import { debounce } from "../../utils/debounce";
import {
  activeViewConfigReadOnlyAtom,
  setActiveViewAtom,
} from "../views/views-config";
import { HomeVinyl } from "./home-vinyl";

export const AppHeader = () => {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-40 flex items-center justify-between p-4">
      <HomeVinyl />
      <SearchBar />
    </header>
  );
};

const SearchBar = () => {
  const view = useAtomValue(activeViewConfigReadOnlyAtom);

  const setView = useSetAtom(setActiveViewAtom);

  const [inputValue, setInputValue] = useState("");

  const debouncedSearch = useMemo(
    () =>
      debounce(
        ({ query }: { query: string }) =>
          setView(
            query.length > 0
              ? {
                  key: "search",
                  data: { query },
                  skipAlbumDimensionsUpdate: view?.key === "search",
                }
              : { key: "home", data: { seed: ulid() } },
          ),
        300,
      ),
    [setView],
  );

  useEffect(() => {
    if (inputValue.length && view?.key !== "search") {
      setInputValue("");
    }
  }, [view?.key]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setInputValue(query);
    debouncedSearch({ query });
  };

  return (
    <div className="pointer-events-auto relative flex items-center">
      <input
        type="text"
        placeholder="Search..."
        className="rounded-md border border-zinc-800 bg-zinc-950/75 py-1 pr-10 pl-3 text-zinc-300 focus-visible:outline-violet-600/25"
        onChange={handleInputChange}
        value={inputValue}
      />
      {inputValue && inputValue.trim() !== "" && (
        <button
          className="absolute right-1.5 cursor-pointer rounded-md p-1 transition-colors hover:bg-zinc-600/50 active:bg-zinc-600/60"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setInputValue("");
            setView({ key: "home", data: { seed: ulid() } });
          }}
        >
          <X className="h-4 w-4 text-zinc-400" />
        </button>
      )}
    </div>
  );
};
