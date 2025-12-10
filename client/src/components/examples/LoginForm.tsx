import { LoginForm } from "../LoginForm";

export default function LoginFormExample() {
  return (
    <LoginForm
      onLogin={async (email, password) => {
        console.log("Login:", email, password);
        await new Promise((r) => setTimeout(r, 1000));
      }}
    />
  );
}
