import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
};

export function Extension() {
  const { i18n } = shopify;
  return (
    <s-pos-block heading='block_heading'>
      <s-button
        slot="secondary-actions"
        onClick={() => shopify.action.presentModal()}
      >
        open
      </s-button>
      <s-box padding="large">
        <s-text>Product block content</s-text>
      </s-box>
    </s-pos-block>
  );
}