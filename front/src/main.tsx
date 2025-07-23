import ReactDOM from "react-dom/client";
import 'antd/dist/reset.css';
import Clerk from "./Clerk";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(<Clerk />);
