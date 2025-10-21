import { HomeVinyl } from "./home-vinyl";

export const AppHeader = () => {
  return (
    <header className="border- pointer-events-none fixed top-0 right-0 left-0 z-50 flex items-center justify-between p-4">
      <HomeVinyl />
    </header>
  );
};
