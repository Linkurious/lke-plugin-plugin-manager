import { PluginParser } from "./PluginParser";

async function test() {
  const FILE = "/Users/andrea/Downloads/test/hello-world-1.0.0.lke";
  // const FILE = "/Users/andrea/Downloads/Cheick.gif";
  // const FILE = "/Users/andrea/Downloads/test/bad.lke";
  // const FILE = "/Users/andrea/Downloads/test/bad-multi.lke";
  // const FILE = "/Users/andrea/Downloads/test/folde";
  // const FILE = "/Users/andrea/Downloads/test/folder";
  // const FILE = "/Users/andrea/Downloads/test/hello-world-1.0.0-f.lke";
  // const FILE = "/Users/andrea/Downloads/test/hello-world-1.0.0-sf.lke";
  // const FILE = "/Users/andrea/Downloads/test/hello-world-1.0.0-ssf.lke";
  // const FILE = "/Users/andrea/Downloads/test/link-folder.lke";
  // const FILE = "/Users/andrea/Downloads/test/link.lke";
  // const FILE = "/Users/andrea/Downloads/test/link2-folder.lke";
  // const FILE = "/Users/andrea/Downloads/test/link2.lke";

  const plugin = FILE;
  // const plugin = fs.createReadStream(FILE);

  const pluginParser = new PluginParser(plugin);
  console.debug("Parsing...");
  if (await pluginParser.parse()) {
    console.debug(pluginParser.manifest);
    console.debug(pluginParser.normalizedName);
  }
  else
    console.debug(pluginParser.errorMessage);
}

void test();
