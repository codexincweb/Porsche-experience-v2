import { createContext, useContext } from "react";

export const StageContext = createContext(null);
export const ScrollContext = createContext({ current: null });
export const useStage = () => useContext(StageContext);
export const useScroll = () => useContext(ScrollContext);
