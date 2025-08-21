import { sendMessage } from "./bot";
import config from "./config";

const logError = async (message: string) => {
      await sendMessage(
        config.ADMIN_ID,
        message
      );
};

export default logError;
