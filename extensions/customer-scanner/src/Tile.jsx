import { render } from "preact";

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {


  return (
    <s-tile
      heading="Upload Photo"
      subheading="authentication and then upload image to server"

      onClick={() => shopify.action.presentModal()}
      
    />
  );
};
