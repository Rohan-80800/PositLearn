import { useEffect } from "react";

const ClearLocalStorage = () => {
  useEffect(() => {
    localStorage.clear();
  }, []);

  return null;
};

export default ClearLocalStorage;
