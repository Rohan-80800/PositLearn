import Sidebar from "./sidebar";
import Navbar from "./navbar";
import Layout from "antd/es/layout/layout";
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { Colors } from "../config/color";
import Loader from "./loader";

const Layouts = () => {
  const colors = Colors();
  const { collapsed } = useSelector((state) => state.sidebar);
  const { isMobile } = useSelector((state) => state.navbar);
  const { isLoading } = useSelector((state) => state.loader);

  return (
    <Layout style={{ backgroundColor: colors.background, overflow: "hidden" }}>
      <Layout
        style={{
          backgroundColor: colors.theme,
          color: colors.textcolor,
          minHeight: "100vh",
          marginLeft: isMobile ? 0 : collapsed ? 70 : 210,
          transition: "margin-left 0.3s ease",
          marginTop: "55px",
        }}
      >
        <Navbar />
        <Sidebar />
        {isLoading && <Loader />}
        <Outlet />
      </Layout>
    </Layout>
  );
};

export default Layouts;
