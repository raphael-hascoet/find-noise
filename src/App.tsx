import "./App.css";
import DrawArea from "./components/draw-area";
import { InitWrapper } from "./init-wrapper";

function App() {
  return (
    <InitWrapper>
      <DrawArea />
    </InitWrapper>
  );
}

export default App;
