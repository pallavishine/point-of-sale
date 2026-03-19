import "@shopify/ui-extensions/preact";
import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
};

export function Extension() {
  const {i18n} = shopify;
  
  return (
    <s-pos-block heading={i18n.translate('block_heading')}>
      <s-button
        slot="secondary-actions"
        onClick={() => shopify.action.presentModal()}
      >
        Main Button
      </s-button>
      <s-box padding="large">
        <s-text>Main Button</s-text>
      </s-box>
    </s-pos-block>
  );
}