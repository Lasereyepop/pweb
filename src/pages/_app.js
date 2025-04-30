import "@/styles/globals.css";
import { ChakraProvider } from "@chakra-ui/react";
import customTheme from "../components/theme";
import Head from "next/head";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider theme={customTheme}>
      <Head>
        <title>InterChroma</title> {/* Set the title here */}
        {/* Add the favicon here */}
        <link rel="icon" href="/images/photograph.png" type="image/png" height={1} width={5}/>
      </Head>
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </ChakraProvider>
  );
}