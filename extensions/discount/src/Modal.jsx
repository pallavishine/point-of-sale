import {render} from 'preact';
import {useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const {i18n} = shopify;
  
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [appliesTo, setAppliesTo] = useState('all');

  return (
    <s-page heading={i18n.translate('modal_heading')}>
      <s-scroll-box>
        <s-box padding="small">
          <s-text-field
            label="Discount Amount"
            type="number"
            value={discountAmount}
            onInput={(e) => setDiscountAmount(e.target.value)}
            placeholder="Enter discount amount"
          />
          <s-text-field
            label="Discount Percentage"
            type="number"
            value={discountPercentage}
            onInput={(e) => setDiscountPercentage(e.target.value)}
            placeholder="Enter discount percentage (0-100)"
            min="0"
            max="100"
          />
          <s-choice-list
            title="Applies to"
            choices={[
              {label: 'All Products', value: 'all'},
              {label: 'Specific Collection', value: 'collection'},
              {label: 'Specific Product', value: 'product'}
            ]}
            selected={appliesTo}
            onChange={setAppliesTo}
          />
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}
