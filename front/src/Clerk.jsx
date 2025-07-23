import { Provider } from "react-redux";
import store from "./redux/store";
import "antd/dist/reset.css";
import App from "./App";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { useSelector } from "react-redux";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const Clerk = () => {
  return (
    <Provider store={store}>
      <ClerkThemeWrapper />
    </Provider>
  );
};

const ClerkThemeWrapper = () => {
  const { isDarkTheme } = useSelector((state) => state.navbar);

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        baseTheme: isDarkTheme ? dark : undefined,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <App />
    </ClerkProvider>
  );
};

export default Clerk;
