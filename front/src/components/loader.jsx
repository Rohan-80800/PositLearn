import "../App.css";
import { Colors } from "../config/color";
import { useSelector } from "react-redux";
import { Image, Flex } from "antd";

const Loader = ({ isConstrained = false }) => {
  const colors = Colors();
  const { collapsed } = useSelector((state) => state.sidebar);
  const { isMobile } = useSelector((state) => state.navbar);

  const navbarHeight = 55;
  const sidebarWidth = isMobile ? 0 : collapsed ? 70 : 210;

  return (
    <Flex
      align="center"
      justify="center"
      className={`bg-opacity-50${
        isConstrained ? "relative w-full h-full" : "fixed top-0 left-0"
      }`}
      style={
        isConstrained
          ? { backgroundColor: colors.background, zIndex: 1000 }
          : {
              top: `${navbarHeight}px`,
              width: `calc(100vw - ${sidebarWidth}px)`,
              left: `${sidebarWidth}px`,
              height: `calc(100vh - ${navbarHeight}px)`,
              backgroundColor: colors.background,
              zIndex: 1000,
            }
      }
    >
      <Image
        src="/Loder.gif"
        alt="Loading..."
        className="max-w-[65px]"
        preview={false}
      />
    </Flex>
  );
};

export default Loader;
